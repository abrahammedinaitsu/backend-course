# Rúbrica acumulativa — clases 1 a 7 (BACKEND-01-07-R1)

Rúbrica del diagnóstico 7 en 1. La IA clasifica evidencia con esta rúbrica;
**no inventa la nota**: asigna niveles enteros por dimensión y el cálculo
numérico ocurre después, fuera del modelo.

## Escala común

| Nivel | Descriptor |
| ---: | --- |
| `0` | La evidencia contradice el criterio o demuestra una comprensión fundamentalmente incorrecta |
| `1` | Evidencia mínima, fragmentaria o con problemas graves |
| `2` | Comprensión básica o implementación parcial, todavía dependiente y con vacíos |
| `3` | Cumplimiento correcto respaldado por evidencia verificable |
| `4` | Cumplimiento correcto, explicación propia, verificación y reconocimiento de consecuencias |
| `X` | No evaluable por falta de evidencia |

Reglas de aplicación:

* Sin evidencia se usa `X` — nunca se inventa.
* Una afirmación no equivale a una ejecución.
* Sin prueba o validador, la práctica no puede superar `2` cuando la verificación era requerida.
* Mucho texto no aumenta el nivel; sofisticación accidental tampoco.
* Código generado por IA puede recibir nivel alto si está comprendido y verificado.
* Código funcional no demuestra automáticamente comprensión.
* Las contradicciones activan revisión docente (`ACTION=VERIFY`).
* No se penaliza gramática, ortografía ni estilo salvo que impidan comprender.

## Cuatro dimensiones (orden fijo K-P-V-E)

| Dim. | Nombre | Qué mide | Peso posterior |
| --- | --- | --- | ---: |
| K | Knowledge | Conceptos y relaciones explicados correctamente | 25% |
| P | Practice | Artefactos, código y comportamiento implementado | 35% |
| V | Verification | Pruebas, validadores, comandos y evidencia de comprobación | 25% |
| E | Explanation | Capacidad de explicar decisiones, límites, uso de IA y dudas | 15% |

Fórmula posterior por clase (fuera del modelo):

```text
(K / 4 × 25) + (P / 4 × 35) + (V / 4 × 25) + (E / 4 × 15)
```

## Indicadores por clase

### Clase 1 — Fundamentos de backend

* **K:** proceso activo, entrada, decisión y salida.
* **P:** servidor y rutas básicas ejecutables.
* **V:** evidencia de ejecución y respuestas.
* **E:** explica el flujo sin confundir servidor con petición.

### Clase 2 — HTTP y contratos

* **K:** contrato HTTP, métodos, rutas, status y protocolos.
* **P:** endpoints y contrato documentado.
* **V:** peticiones reproducibles y resultados.
* **E:** justifica decisiones de método y status.

### Clase 3 — Recursos, estado y reglas

* **K:** recurso, representación, safe/idempotent, estado y reglas.
* **P:** filtros, PATCH, transiciones y decisión documentada.
* **V:** matriz y evidencia de errores válidos.
* **E:** diferencia validación y conflicto de negocio.

### Clase 4 — PostgreSQL y persistencia

* **K:** modelo relacional, migración, seed, persistencia y transacción.
* **P:** esquema PostgreSQL, migraciones, queries e historial.
* **V:** conexión, ejecución, integridad y rollback cuando aplique.
* **E:** explica decisiones y límites de Supabase/SQL.

### Clase 5 — Autenticación y autorización

* **K:** identidad, hashing, JWT, autenticación y autorización.
* **P:** register, login, middleware, roles y ownership.
* **V:** casos positivos, negativos y validador.
* **E:** explica amenazas básicas y campos controlados.

### Clase 6 — Onboarding y pruebas

* **K:** prueba, aserción, regresión y recorrido del proyecto.
* **P:** ambiente, historia, bug y pruebas asistidas.
* **V:** doctor, suite y validator.
* **E:** distingue qué comprendió y qué produjo la IA.

### Clase 7 — Diagnóstico y errores

* **K:** síntoma, causa, error esperado, logging y readiness.
* **P:** error handler, request ID, logs, health y ready.
* **V:** incidentes reproducidos, regresiones y validator.
* **E:** explica hipótesis y evidencia.

## Estados y acciones del RESULT_CODE

Estados: `COMPLETE` · `PARTIAL` · `INSUFFICIENT_EVIDENCE`.

Acciones: `NONE` (sin intervención prioritaria) · `SUPPORT` (reforzar temas) ·
`VERIFY` (conviene comprobación oral o demostración breve).

`ACTION=VERIFY` **no significa fraude**: significa que una conversación corta
aclararía más que el paquete por sí solo.
