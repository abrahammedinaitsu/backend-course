# Comparación — Lite vs Full

> Hecha **después** de tener las dos versiones funcionando. No se trata de decidir cuál es
> «mejor», sino de nombrar qué cambió y qué costó.

## Tabla de dimensiones

| Dimensión       | Request API Lite | Request API Full |
| --------------- | ---------------- | ---------------- |
| Contrato        | No había contrato escrito; el comportamiento se descubrió ejecutando. Prometía poco y lo cumplía peor: la ruta de listado estaba mal nombrada, la consulta fallida devolvía `200`, la creación devolvía `200` y aceptaba títulos ausentes. | Contrato declarado en `docs/http-contract.md` **antes** del código. La implementación coincide: `200`/`201`/`404`/`400` y forma de error uniforme `{ "error": ... }`. |
| Organización    | Todo en un archivo (`server.js`): app, datos, rutas y arranque mezclados. | Cinco archivos con una responsabilidad cada uno: `server.js` (arranque), `app.js` (configuración), `routes/` (endpoints), `data/` (datos) y `docs/` (contrato). |
| IA              | Sin IA. Análisis y corrección 100 % propios, hechos antes de cualquier asistente. | IA usada después de escribir la especificación y el contrato. Lo propuesto se aceptó, modificó o rechazó contra el contrato. |
| Lectura         | Rápida para un archivo, pero hay que leerlo entero para saber qué hace; el nombre de la ruta de listado confunde. | La entrada es `docs/http-contract.md`: con eso ya se sabe qué promete la API. El código confirma el reparto de responsabilidades leyendo el árbol. |
| Modificación    | Cambiar cualquier cosa obliga a tocar el mismo archivo que contiene todo. | Cambiar una ruta se hace en `routes/`; cambiar el origen de datos, solo en `data/`; cambiar puerto, en `server.js`. |
| Complejidad     | Baja: una pieza. | Media: cinco archivos. Más que sostener en la cabeza, pero cada uno es pequeño y se justifica. |
| Verificación    | Manual, contra supuestos: al no haber contrato, no está claro qué se espera. | Manual contra contrato (casos C1–C7). Cada resultado observado se compara con lo que el contrato exige. |
| Extensibilidad  | Agregar un endpoint significa meter más `if`/rutas en el mismo archivo. | Agregar un endpoint es añadir un manejador en `routes/`; cambiar de memoria a base de datos toca solo `data/`. |

## Preguntas de reflexión

1. **¿Qué problemas del Lite eran problemas HTTP?** La ruta de listado con verbo (`/getRequests`), la contradicción estado/cuerpo en `GET /requests/999` y el `200` en lugar de `201` al crear. Los tres son del contrato HTTP, no del framework.
2. **¿Qué problemas eran decisiones de organización?** El hecho de tener todo en un archivo hacía que el defecto de validación y los de rutas estuvieran mezclados. Sin contrato escrito, tampoco había contra qué contrastar el comportamiento.
3. **¿Qué resolvió la estructura del Full?** Separó responsabilidades: el contrato se lee primero, el arranque no sabe de rutas y el acceso a datos está aislado en `data/requests.js`. Eso hizo que el comportamiento fuera predecible y comprobable.
4. **¿Qué complejidad introdujo?** Más archivos que recorrer: saber que `app.js` monta el router en `/requests` (por eso la ruta interna es `'/'`) exige leer dos archivos. Es un costo pequeño a cambio de poder sustituir piezas.
5. **¿Qué generó bien la IA?** Los tres manejadores, alineados con el contrato, y el uso correcto de `generateId()` y `Number(req.params.id)`.
6. **¿Qué añadió innecesariamente?** Un endpoint de filtrado no pedido, un error con `200` y `success: false`, y la idea de mover los datos al router. Todo eso quedó fuera.
7. **¿Cuál versión fue más fácil de entender?** El Full, pero no por el código: por el contrato. `docs/http-contract.md` dice qué esperar antes de abrir cualquier archivo.
8. **¿Cuál sería más fácil de extender?** El Full. Agregar un endpoint es un manejador nuevo en `routes/`; en el Lite era seguir apilando lógica en un único archivo.
9. **¿Qué contrato permanecería igual si cambiamos Express?** Todo el contrato HTTP: métodos, rutas, parámetros, códigos de estado, forma del cuerpo. Express solo es una forma de cumplirlo; con el módulo `http` de la clase 1 habría que escribirlo a mano, pero la promesa sería idéntica.
10. **¿Por qué HTTP es suficiente para este proyecto?** Porque la interacción es puntual y siempre la inicia el cliente: pedir la lista, pedir una, crear una. No hay necesidad de que el servidor empuje información sin que se la pidan.
11. **¿Qué cambiaría si necesitáramos actualizaciones en vivo?** Necesitaríamos que el servidor envíe datos sin que el cliente pregunte a cada rato. HTTP con `polling` funcionaría pero gastaría peticiones; sería mejor una conexión persistente.
12. **¿Utilizaríamos SSE o WebSocket para mostrar progreso?** Para mostrar *progreso unidireccional* (el servidor informa avances), SSE es suficiente: es un flujo de un solo sentido sobre HTTP. WebSocket conviene si además el cliente debe enviar mensajes por el mismo canal.
13. **¿Qué ocurriría si crear una solicitud iniciara un proceso de veinte minutos?** Mantener la petición HTTP abierta 20 minutos no es razonable: bloquearía al cliente y al servidor. Lo correcto es responder rápido (`202 Accepted`) y procesar en segundo plano.
14. **¿Cuándo sería razonable una cola de mensajes?** Cuando hay trabajo costoso, asíncrono o que debe sobrevivir a reinicios y a picos de carga. La cola desacopla quien pide de quien procesa y permite reintentos.

## Cierre

Si tuviera que empezar de nuevo el proyecto Full, **escribiría el contrato HTTP todavía más
detallado antes de tocar código** —incluyendo explícitamente el caso del body JSON mal formado— y
**revisaría al detalle las exclusiones justo después del primer resultado de la IA**, no al final.
Me di cuenta de que la mayor parte del valor no estuvo en generar los manejadores (eso fue rápido)
sino en decidir qué se pedía y verificar que lo obtenido cumpliera la promesa. La próxima vez
anotaría la especificación y el contrato como un solo documento vivo, para que cualquier cambio se
refleje en ambos a la vez.
