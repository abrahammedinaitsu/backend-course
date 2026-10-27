# Class 06 work log — Mi primer ticket en un backend existente

**Taller:** onboarding · **Entrega:** 06 · **Entorno:** Node v24.16.0 · npm 11 · PostgreSQL (Supabase) · `node:test` + `supertest`

Este documento responde las preguntas de la bitácora del taller con mis propias
palabras y registra **qué hice, cómo lo verifiqué y por qué**. No es un resumen
de teoría: es la historia del trabajo sobre un backend que no escribí.

---

## Entorno

**¿Qué configuré?**

El taller pide partir de una base de datos propia y sin configurar. Usé el
mismo proyecto Supabase de las clases anteriores, pero **aislé el taller en su
propio esquema de PostgreSQL (`class06`)** para que sus tablas
(`users`, `requests`, `request_history`) no chocaran con las de la clase 05
(`users`, `requests`, `request_status_history`) que viven en `public`.

- `DESIGN`: no toqué las tablas de la clase 05. El taller vive en `class06`.
- `.env` (NO versionado): `DATABASE_URL` apunta al esquema con
  `?options=--search_path%3Dclass06`, `JWT_SECRET` **generado** con
  `npm run generate:secret` (no inventado a mano), `PORT=3001` para no colisionar
  con el backend de la clase 05 (puerto 3000).
- `.env.example` SÍ se versiona: documenta QUÉ configurar sin exponer valores.

**¿Qué comando confirmó que funcionó?**

`npm run class-06:doctor` → **`Environment ready.`** (10/10 marcas PASS:
archivo de entorno, variables requeridas, conexión, alcanzabilidad, tabla de
migraciones, migraciones aplicadas, usuarios del seed, requests del seed,
historial, y la aplicación consultando la base).

**Ajuste que tuve que hacer y por qué:** el doctor y el validador usaban
`to_regclass('public.users')`, con `public` escrito a mano. Como la aplicación
se conecta con `search_path=class06`, esa consulta miraba el lugar equivocado y
reportaba "esquema no instalado" aunque sí lo estaba. Lo corregí para resolver
los nombres **sin calificar** (`to_regclass('users')`), es decir, a través del
mismo `search_path` que usa la aplicación. Es el cambio mínimo y correcto:
el diagnóstico debe mirar donde la app realmente trabaja.

---

## Request flow (el recorrido de una petición)

Con el vocabulario de sufijos del taller (`.routes`, `.service`, `.store`,
`.policy`, `.mapper`):

1. **Entra** por `src/app.js`: monta CORS, `express.json()`, `/auth` y
   `/requests`.
2. **Autenticación**: en `/requests` corre primero el middleware `authenticate`
   (`src/middleware/authenticate.js`). Verifica el Bearer con `jose` y construye
   `req.auth` (`{ userId, role }`), o responde **401** y el router nunca corre.
3. **Autorización**: NO vive en el middleware. La decide la **política pura**
   `src/modules/requests/request.policy.js` (`canViewRequest`,
   `canViewHistory`, `canEditContent`, ...), aplicada por el **servicio**
   `requests.service.js` contra la fila actual. Separación: el middleware dice
   QUIÉN eres; la política dice QUÉ puedes; el servicio conserva las reglas de
   caso de uso.
4. **HTTP**: `requests.routes.js` extrae path/query/body y traduce resultados y
   errores tipados a respuestas. No tiene SQL ni reglas de dominio.
5. **PostgreSQL**: `requests.store.js` ejecuta consultas parametrizadas y
   devuelve filas o `null`. El alcance por dueño se hace **en SQL**
   (`WHERE created_by = $n`), no filtrando en JavaScript.

---

## Bug fixed — BUG-106

**¿Qué pasaba?** Con un filtro de colección **válido que no tenía resultados**,
`GET /requests` respondía **404**. Reproducción real con el seed: login como
`ana.requester.seed@example.test` y `GET /requests?status=closed`. Ana no tiene
requests cerradas, así que el filtro es válido y no coincide con nada → el
servidor contestaba `404 Not Found` con `REQUEST_NOT_FOUND`.

**¿Qué debía pasar?** Una colección con cero coincidencias es
**`200 OK` con `[]`**. Una colección vacía NO es un recurso que no existe.
El `404` es para un recurso individual inexistente (o que no debe revelarse).

**¿Dónde vivía?** En `src/modules/requests/requests.service.js`, función
`listRequests`. Tras `findAll(scope)`, lanzaba una excepción si
`rows.length === 0`:

```js
if (rows.length === 0) {
  throw new AppError('resource', 'REQUEST_NOT_FOUND', 'No requests matched the given filters.');
}
```

**Cambio mínimo:** eliminar ese bloque. `rows.map(mapRequestRow)` ya devuelve
`[]` cuando no hay filas. El `404` sigue existiendo donde corresponde:
`GET /requests/:id` (`getRequest`).

**¿Qué prueba lo protege?** `test/requests.test.js` →
`'a valid collection filter with zero matches answers 200 [] (BUG-106)'`.
Prepara un requester nuevo sin requests, pide `?status=closed`, y comprueba
`status === 200` y `deepEqual(body, [])`. **Falla en el código con el bug y pasa
con el arreglo.**

---

## Feature implemented — FEATURE-206

**¿Qué hace `GET /requests/:id/history`?** Devuelve la lista de eventos de
cambio de una solicitud, del más antiguo al más nuevo, con una regla de
desempate estable (`ORDER BY created_at, id`). Cada evento expone SOLO sus
campos propios: `status_changed` trae `fromStatus`/`toStatus`;
`priority_changed` trae `fromPriority`/`toPriority`. El actor interno
(`changed_by`) **no** se expone.

**¿Quién puede usarlo?**
- Requester: **solo sus propias** solicitudes.
- Agente: **cualquiera**.
- Solicitud inexistente → **404**.
- Solicitud sin eventos → **200** con `[]`.
- Sin token → **401**.

**Ajenas responden 404, no 403:** reutilicé `canViewHistory`, que **delega** en
`canViewRequest` — la MISMA regla que ver la solicitud. Decisión 002 de la clase
05 sigue vigente: no revelar la existencia de recursos ajenos. No inventé una
regla nueva ni dupliqué autorización.

**¿Cómo se ordena?** Más antiguo primero, con el `id` como desempate estable
cuando dos eventos comparten timestamp.

**Piezas reutilizadas (no reinventadas):** `findHistory` (store),
`canViewHistory` (policy), `mapHistoryEventRow` (mapper) y `notFound`. Yo
agregué solo lo que faltaba: el caso de uso `getHistory` (servicio) y la ruta
`/:id/history`. Si hubiese escrito todo desde cero, habría duplicado
autorización y mapeo, roto la separación de capas y arriesgado inconsistencias
con el contrato existente.

---

## Test explained

Elijo: `'a requester cannot read another user history (same 404 as the request)'`.

- **Preparar:** un dueño y un desconocido; ambos inician sesión; el dueño crea
  una solicitud (`createUser`, `loginAs`, `createRequestAs`).
- **Actuar:** el desconocido pide `GET /requests/:id/history` de la solicitud del
  dueño.
- **Comprobar:** `response.status === 404`.
- **Regla que protege:** la privacidad de la historia entre usuarios, y que el
  endpoint de historial **hereda** el contrato de la solicitud (no lo cambia).

Este patrón Preparar / Actuar / Comprobar (AAA) es el mismo de toda la suite.

---

## AI assistance

**¿Qué me ayudó a entender la IA?** A mapear rápido un repo ajeno: el rol de
cada sufijo (`.routes`/`.service`/`.store`/`.policy`/`.mapper`), dónde estaba el
bug y qué piezas ya existían para el historial. Aceleró la **comprensión**, no
reemplazó el criterio.

**¿Qué código ayudó a producir?** El borrador del caso de uso `getHistory` y su
ruta, siguiendo los patrones existentes.

**¿Qué verifiqué yo mismo?**
1. Reproduje BUG-106 con `curl` real contra el servidor antes de tocar nada
   (`404`), y confirmé el `200 []` después.
2. Probé FEATURE-206 por HTTP con tres identidades reales (dueño, ajeno, agente)
   más los casos 401/404.
3. Corrí `npm test` (19/19) y `npm run validate:class-06`
   (**PASSED 12/12**) **dos veces seguidas**.

**Sugerencia incompleta que detecté:** en el arranque, `npm test` reportaba
`tests 0` porque el glob `'test/*.test.js'` no se expandía en Windows. La causa
no era el código de prueba (la expansión nativa sí corría 19) sino la forma del
comando. Lo dejé en una forma que funciona en Node ≥21 en Windows
(`node --test ... "test/*.test.js"`, donde Node expande el glob).

**Otro ajuste verificado:** el doctor/validador con `public` fijo (descrito en
Entorno). No acepté el "esquema no instalado" como verdad: verifiqué dónde
habían quedado las tablas de verdad (`class06.*`) antes de decidir el cambio.

---

## Remaining doubt

El comando de pruebas depende de que Node expanda el glob (comportamiento de
Node ≥21). Si el entorno bajara a Node 20, `npm test` podría volver a reportar
`tests 0`. Lo dejo anotado: la solución robusta sería fijar los archivos
explícitamente o usar un runner con expansión propia. No lo cambié para no
desviarme del starter sin necesidad.

---

## Ticket de salida — Clase 06

### Sobre el entorno

**1. ¿Qué hace `npm run db:migrate` y por qué puedes ejecutarlo dos veces sin
romper nada?**
Aplica en orden lexicográfico cada `.sql` pendiente de `database/migrations`,
una transacción por migración, y registra lo aplicado en la tabla
`schema_migrations`. La segunda vez **omite** las ya registradas
(`[SKIPPED]`), así que no re-ejecuta ni rompe nada. Lo comprobé: primera corrida
`[APPLIED]` x4, segunda `[SKIPPED]` x4 + "No pending migrations".

**2. ¿Qué diferencia hay entre una migración y el seed? ¿Cuál puedes volver a
ejecutar sin pensarlo y por qué?**
La migración **cambia la estructura** (crea tablas, constraints, índices) y es
**inmutable**: una vez aplicada, se recuerda y no se repite. El seed **carga
datos de demostración** (usuarios, solicitudes, eventos). Las dos son repetibles,
pero por razones distintas: `db:migrate` es seguro porque **omite** lo ya
aplicado; `db:seed` es seguro porque está escrito para recrear SOLO los datos del
seed (borra únicamente lo de los emails `*.seed@example.test` y nunca trunca).
Aun así, la migración es la que correría "sin pensar": no toca datos de nadie.

**3. ¿Cuál es secreto real y cuál es dato de demostración: `DATABASE_URL`,
`JWT_SECRET`, la contraseña del taller de `ana.seed@example.test`? ¿Qué harías
si expusieras uno de los reales?**
`DATABASE_URL` y `JWT_SECRET` son **secretos reales** (la cadena da acceso a la
base; el secreto firma/valida los tokens de TODOS los usuarios). La contraseña de
`ana.seed@example.test` es **dato de demostración**: vive en el material del
taller y solo protege una cuenta sintética. Si expusiera un secreto real:
rotarlo de inmediato (nueva contraseña de base / nuevo `JWT_SECRET`, que invalida
los tokens viejos), revisar accesos, y compartir errores **reemplazando** el
valor (`DATABASE_URL=[configured]`), nunca pegado en texto.

### Sobre el código

**4. ¿En qué archivo vivía BUG-106 y qué regla del contrato rompía?**
En `src/modules/requests/requests.service.js`, función `listRequests`. Rompía la
regla de la clase 03 sobre **colecciones**: un filtro válido sin coincidencias
debe responder `200 []`; lanzaba `REQUEST_NOT_FOUND` (404) tratando la colección
vacía como recurso inexistente.

**5. Diferencia entre "un filtro válido sin resultados" (200 `[]`) y "un recurso
que no existe" (404).**
El primero es una **consulta exitosa** sobre una colección: la operación salió
bien, simplemente no hay elementos que listar. El segundo es **direccionar un
recurso individual** (`GET /requests/:id`) cuya existencia o visibilidad no se
confirma. El código no debe confundir "no hay nada en la lista" con "no existe
eso que pediste".

**6. En FEATURE-206, ¿por qué una solicitud ajena responde 404 y no 403? ¿Quién
tomó esa decisión?**
Porque **no se debe revelar la existencia** de recursos ajenos: un 403 diría
"existe, pero no puedes". Reutilicé `canViewHistory`, que delega en
`canViewRequest`, que a su vez responde 404 para ajenos — decisión **002 de la
clase 05**, ya tomada en el contrato. No la tomé yo ni la IA: el contrato
existente la fija, y la respeté.

**7. ¿Qué piezas reutilizaste y qué habría pasado si hubieras escrito todo desde
cero?**
Reutilicé `findHistory` (store), `canViewHistory` (policy),
`mapHistoryEventRow` (mapper) y `notFound`. Escribí solo `getHistory` (servicio)
y la ruta. Desde cero habría duplicado autorización y mapeo, con riesgo de
inconsistencia con el contrato y de romper la separación de capas.

### Sobre las pruebas

**8. ¿Qué significan Preparar / Actuar / Comprobar? Señálalas en una prueba
tuya.**
Preparar = crear el estado mínimo; Actuar = ejecutar UNA acción; Comprobar =
verificar el resultado. En
`'a requester cannot read another user history'`: Preparar = dueño +
desconocido + sesión + solicitud; Actuar = el desconocido pide el historial
ajeno; Comprobar = `status === 404`.

**9. ¿Por qué las pruebas crean datos con identificadores únicos y limpian solo
lo que crearon?**
Para ser **aisladas y no destructivas**: los emails llevan un `runId` aleatorio,
así que dos corridas (o una corrida y el seed) nunca colisionan. La limpieza
borra por los **ids registrados**, en orden de dependencia
(historial → requests → usuarios), nunca con un `DELETE` amplio ni `TRUNCATE`.
Así el seed y los datos de otros sobreviven.

**10. Cuando una prueba falló, ¿qué leíste primero y qué te dijo sobre dónde
buscar?**
Leí primero el **resumen del contador** y el nombre de la prueba fallida, luego
el `assert`. En el arranque, `tests 0` me dijo que **no se estaba ejecutando
ninguna prueba** (problema de comando/glob), no un fallo de lógica: eso redirigió
la búsqueda al script, no al código de prueba.

### Sobre la IA y sobre ti

**11. Un ejemplo real de algo que la IA respondió y que verifiqué antes de
aceptar. ¿Cómo lo verifiqué?**
La IA propuso dónde estaban el bug y las piezas del historial. **No lo acepté de
palabra**: reproduje BUG-106 con `curl` real (`404` antes), confirmé el arreglo
(`200 []` después), y ejercité el endpoint con tres roles reales más 401/404.
También verifiqué con `npm test` y el validador oficial.

**12. ¿Qué decisión NO habrías delegado a la IA y por qué?**
Dos: (a) **cómo gestionar los secretos/esquema** (aislar el taller en `class06`,
generar el `JWT_SECRET`, no versionar `.env`), porque compromete seguridad y los
datos de clases anteriores; y (b) **cambiar el contrato** (p. ej. hacer que
ajenas devuelvan 403 o exponer `changedBy`). La IA acelera la comprensión, pero
el contrato y la seguridad son responsabilidad mía.

**13. ¿Qué fue lo más difícil y qué harías distinto con otro backend
desconocido?**
Lo más difícil fue **orientarme sin leerlo todo**: distinguir un ajuste legítimo
de entorno (el `public.` fijo del doctor) de una regla que no debía tocar.
Distinto: empezar por los sufijos y el flujo `.routes → .policy → .service →
.store`, reproducir TODOS los síntomas por HTTP antes de editar, y fijar primero
la línea base (doctor + `npm test` verde) antes de tocar una línea.

---

> **Lo que hice:** comprendí un backend ajeno, configuré el entorno, corregí
> BUG-106, implementé FEATURE-206, escribí pruebas que lo protegen y expliqué
> cada cambio con evidencia verificable (19/19 tests, validador PASSED 12/12).
