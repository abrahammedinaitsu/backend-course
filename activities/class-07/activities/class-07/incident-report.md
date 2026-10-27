# Class 07 incident report

Completado **mientras** investigaba cada incidente. Separo hechos (Evidence)
de interpretaciones (Hypotheses): un "creo que" nunca va en Evidence.

Identidad de la guardia:
- Proyecto: `activities/class-07/` (deriva de la solución de la clase 06, con defectos deliberados).
- Base: **la misma de la clase 06** (esquema `class06` de Supabase). Migraciones en `SKIPPED`.
- Node v24.16.0 · `node:test` + Supertest · Express 5.

---

## Baseline

**¿Qué comando confirmó el estado inicial?**

`npm run class-07:doctor` → **`Environment ready for incident response.`** (7/7 PASS).

Luego, la secuencia completa de baseline, ANTES de tocar cualquier código:

- `npm run db:migrate` → las 4 migraciones en **`[SKIPPED]`** + "No pending migrations." → confirma que reuso la base de la clase 06, no creé nada nuevo.
- `npm run db:seed` → 3 usuarios, 6 solicitudes, 15 eventos.
- `npm test` → **20 pass, 17 todo, 0 fail**. Los 17 `todo` son intencionales: son los huecos que llenaría con las pruebas de regresión.

Punto de comparación común: el commit inicial quedó en `class-07-baseline`. Sin la suite verde inicial no podría distinguir "lo rompí yo" de "ya estaba roto".

---

## Incident 701

### Report

> "Some request identifiers return an internal server error." Un integrador
> construye enlaces a solicitudes y algunos devuelven 500: «a veces funciona
> y a veces no».

### Reproduction

```http
GET http://localhost:3002/requests/not-a-number
Authorization: Bearer <token válido de ana (requester)>
```

### Expected result

```http
400 Bad Request
{"error":{"code":"INVALID_REQUEST_ID","message":"Request id must be a positive integer."},"requestId":"req_..."}
```

### Actual result

```http
500 Internal Server Error
{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}
```

### Hypotheses

1. **(más probable)** El valor de `:id` se convierte con `Number()` sin
   validar y `Number('not-a-number')` es `NaN`; ese `NaN` viaja hasta SQL y
   PostgreSQL lo rechaza. → *Cómo comprobarlo:* reproducir y leer el error
   técnico en el terminal; seguir el valor por el código.
2. `parseInt` acepta basura como `'12abc'` (devuelve `12`), así que la
   validación —si existe— mira solo el prefijo. → *Cómo comprobarlo:* probar
   `12abc` y ver si responde `400` o intenta resolver la solicitud `12`.
3. Alguien ya valida pero responde con el código de error equivocado.
   → *Cómo comprobarlo:* revisar si el 500 es del handler de errores o un
   crash.

### Evidence

Reproducido con el servidor real, ANTES de tocar código. Respuesta HTTP:
`500 INTERNAL_ERROR`. El terminal del servidor mostró el error técnico:

```
[internal] error: invalid input syntax for type bigint: "NaN"
    at async findById (.../src/modules/requests/requests.store.js:50:18)
    at async getRequest (.../src/modules/requests/requests.service.js:75:15)
    at async .../src/modules/requests/requests.routes.js:30:26
  code: '22P02',
```

La traza delata el recorrido: `requests.routes.js:30` lee `req.params.id` y
hace `Number(...)` → `NaN` → `getRequest` → `findById` → SQL. El error de
PostgreSQL (`22P02`) es la prueba de que **la consulta se ejecutó con un valor
inválido**. Nunca pego aquí una cadena de conexión ni un token.

### Confirmed cause

En `src/modules/requests/requests.routes.js`, el `:id` se pasaba con
`Number(req.params.id)`. Para texto, `Number` produce `NaN`; no había ninguna
validación de formato antes de la consulta. La consulta SQL **no debía
ejecutarse** con un formato inválido.

### Correction

Cambio mínimo: nuevo helper `src/modules/requests/request-id.js`
(`parseRequestId`) con una expresión **anclada** `/^[0-9]+$/` sobre el texto
completo — así rechaza `not-a-number`, `1.5`, `0`, `-3` y también `12abc`
(que `parseInt` aceptaría como `12`). Lanza `AppError('contract',
'INVALID_REQUEST_ID', ...)`. Las rutas `GET /:id`, `GET /:id/history` y
`PATCH /:id` usan `parseRequestId(req.params.id)` en vez de `Number(...)`. El
id válido que no existe sigue siendo `404 REQUEST_NOT_FOUND` (no toqué esa
rama).

### Regression test

`test/errors.test.js`:
- `'an alphabetic id answers 400 INVALID_REQUEST_ID, not 500'` — falla con el
  código original (daba 500) y pasa con el fix.
- `'decimal, zero and negative ids are rejected the same way'` — cubre `1.5`,
  `0`, `-3`, `12abc`.
- `'a well-formed id that matches nothing still answers 404'` — blinda que el
  fix NO cambió el contrato del `404`.

---

## Incident 702

### Report

> "Updating some priorities produces an internal server error." Un agente
> intentó marcar una solicitud como `critical` desde una herramienta externa
> y recibió un 500.

### Reproduction

```http
PATCH http://localhost:3002/requests/60
Authorization: Bearer <token de maria (agent)>
Content-Type: application/json

{"priority":"critical"}
```

### Expected result

```http
400 Bad Request
{"error":{"code":"INVALID_PRIORITY","message":"Priority must be low, medium or high."},"requestId":"req_..."}
```

### Actual result

```http
500 Internal Server Error
{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}
```

### Hypotheses

1. **(más probable)** La aplicación no valida la prioridad: el valor
   `critical` viaja hasta el `UPDATE` y lo rechaza la restricción CHECK de
   PostgreSQL. → *Cómo comprobarlo:* reproducir y leer el nombre de la
   restricción en el error técnico.
2. La restricción CHECK no existe o no cubre `priority`. → *Cómo comprobarlo:*
   leer `database/migrations/004_add_constraints_and_indexes.sql`.
3. Sí hay validación, pero solo en `POST` y no en `PATCH`. → *Cómo comprobarlo:*
   revisar `createRequest` y `patchRequest` en el servicio.

### Evidence

Reproducido con el servidor real, ANTES de tocar código. Respuesta HTTP:
`500 INTERNAL_ERROR`. El terminal mostró:

```
[internal] error: new row for relation "requests" violates check constraint "requests_priority_check"
  constraint: 'requests_priority_check',
```

La restricción `requests_priority_check` existe (migración 004:
`CHECK (priority IN ('low','medium','high'))`) y **actuó**. Es la prueba de que
la aplicación no validó primero.

### Confirmed cause

En `src/modules/requests/requests.service.js`, `patchRequest` (y también
`createRequest`) no llamaban a ninguna validación de prioridad — el starter
había eliminado `assertValidPriority`. El valor inválido llegaba al SQL y era
la **base de datos**, no la aplicación, quien lo rechazaba, convirtiendo un
error de contrato del cliente (`400`) en un fallo interno (`500`).

### Correction

Cambio mínimo: se restaura `assertValidPriority(priority)` en el servicio y se
invoca en **ambos** caminos — `createRequest` (si viene `priority`) y
`patchRequest` (si `changes.priority !== undefined`) — **antes** de ejecutar
SQL. Lanza `AppError('contract', 'INVALID_PRIORITY', ...)`. **La restricción
CHECK se conserva intacta**: es la segunda defensa.

### Regression test

`test/errors.test.js`:
- `'an invalid priority answers 400 INVALID_PRIORITY before touching SQL'`
  (PATCH como agente).
- `'creating with an invalid priority also answers 400 INVALID_PRIORITY'`
  (misma regla en POST).
- `'a valid priority change still works after the fix'` (low → high = 200).
- `'the CHECK constraint is still the second defense in the database'` —
  inserta directo en la tabla con prioridad inválida y verifica que PostgreSQL
  responde `23514` (check violation): la restricción sigue viva.

---

## Error flow

- **¿Dónde se crea el error?** En el módulo que detecta el problema: la ruta
  (`parseRequestId`) o el servicio (`assertValidPriority`) lanzan un
  `AppError(category, code, message)` tipado. Son errores *esperados*.
- **¿Cómo llega al middleware de errores?** En Express 5, un `throw` (o una
  promesa rechazada) dentro de un handler async se reenvía **solo** al
  middleware de errores. Las rutas ya no tienen `try/catch`. `authenticate`
  también hace `next(error)`.
- **¿Qué vuelve al cliente?** `errorHandler` traduce la categoría a un estado
  (`contract→400`, `auth→401`, `forbidden→403`, `resource→404`, `domain→409`)
  y responde `{ error: { code, message }, requestId }`. Para un error
  *inesperado* responde un `500 INTERNAL_ERROR` genérico.
- **¿Qué queda solo en el log?** De un error inesperado, el `name`, `message`
  y `stack` reales van al log (`logger.error('unexpected_error', ...)`); del
  error de base, `database_unavailable` con el código. **Nunca** en la
  respuesta: mensaje interno, stack, SQL, nombres de tabla, rutas ni la cadena
  de conexión.

---

## Request ID

**¿Cómo probé que la respuesta y el log son de la misma petición?**

1. Envié `GET /requests/999999999`: la respuesta trajo `X-Request-Id` y, en el
   body del error, el **mismo** `requestId`.
2. Cacé la salida del servidor (`scripts/reproduce-incidents.js` y la
   verificación en vivo) y encontré **una** línea JSON cuyo `requestId`
   coincide exactamente:

```json
{"timestamp":"...","level":"info","event":"request_completed","requestId":"req_39814b42-613c-4514-9877-13ab3f4c684f","method":"GET","path":"/requests/999999999","status":404,"durationMs":116.58,"userId":"...","errorCode":"REQUEST_NOT_FOUND"}
```

El campo `requestId` es el hilo que une las tres superficies: **header =
body = log**. Antes de OPS-703 era imposible hacer esta correlación.

Formato del id: si el cliente manda un `X-Request-Id` con forma razonable
(`[A-Za-z0-9._-]{1,64}`) se conserva (`frontend-trace-42`); si manda basura
(p. ej. 300 caracteres) se reemplaza por `req_<uuid>`. El id identifica la
**petición**, nunca al usuario (jamás el JWT).

---

## AI assistance

**¿Qué me ayudó a entender la IA?** A mapear rápido el starter: dónde vivía
cada defecto y cuál era el rol de cada archivo nuevo (`request-id`,
`request-logger`, `error-handler`, `not-found`, `health.routes`), y por qué el
orden en `app.js` importa (un middleware de errores solo ve lo anterior).

**¿Qué hipótesis propuso?** Para INC-701, que el `NaN` llegaba a SQL como
`bigint` inválido; para INC-702, que la restricción CHECK de PostgreSQL estaba
actuando porque la app no validaba.

**¿Cómo la verifiqué?**
1. Reproduje ambos incidentes con `curl` real **antes** de tocar código.
2. Leí el error técnico del terminal: `22P02 invalid input syntax for type
   bigint: "NaN"` (701) y `violates check constraint "requests_priority_check"`
   (702). Eso convirtió cada hipótesis en causa **confirmada**.
3. Corrí `npm run incidents:reproduce` (antes REPRODUCED ×3; después RESOLVED
   ×3), `npm test` (39/39) y el validador (PASSED 12/12, dos veces).

**¿Qué sugerencia fue incompleta o incorrecta?** La tentación de "arreglar"
INC-702 eliminando la restricción CHECK. Eso silenciaría el 500 pero
**destruiría la segunda defensa** y bajaría la nota (lo dice la consigna: «la
restricción CHECK eliminada *porque estorbaba*»). La decisión correcta era
validar en la aplicación y **conservar** la restricción. También descarté usar
`parseInt` para el id: acepta `'12abc'` como `12`, que no es lo que el cliente
envió.

---

## Remaining doubt

El logger escribe con `console.log`/`console.error`, aceptable para el taller.
En producción me queda la duda de cómo se garantiza que **un objeto de error
con propiedades inesperadas** no termine serializado en un log por accidente:
aquí la allowlist de campos del `request-logger` lo evita, pero quiero
entender mejor el patrón general (redacción central de campos sensibles) para
cuando el número de loggers crezca.

---

## Ticket de salida — Clase 07

### Sobre el diagnóstico

**1. ¿Diferencia entre síntoma y causa? Ejemplo de un incidente.**
El síntoma es lo observable («`PATCH critical` devuelve 500»); la causa es el
mecanismo que lo produce (el servicio no valida la prioridad, así que la
restricción CHECK de PostgreSQL rechaza el valor). El síntoma es la punta; la
causa es dónde está el defecto.

**2. ¿Por qué reproducir antes de corregir?**
Porque un bug que no puedes reproducir no puedes saber si lo corregiste. La
reproducción me dio la línea exacta del error (`requests.store.js:50`, o el
nombre de la restricción) y el punto de comparación: sin ella, cambiaría
código «hasta que funcione» sin saber qué lo arregló ni si volverá.

**3. ¿Diferencia entre error esperado e inesperado, y qué hace el backend
con cada uno?**
Esperado: el que el contrato contempla y el código clasifica (id inválido →
`400`, ajeno → `404`, transición inválida → `409`). Inesperado: el que revela
un defecto (una excepción no contemplada) → `500` genérico, con el detalle
solo en el log. El backend responde distinto a propósito: lo esperado es
información útil para el cliente; lo inesperado no debe filtrar nada interno.

### Sobre el contrato

**4. ¿Por qué un ID inválido devuelve 400 y uno inexistente 404?**
El formato inválido es un problema del **consumidor**: mandó algo que no puede
ser un identificador (`400 INVALID_REQUEST_ID`); la consulta ni se ejecuta. Un
id bien formado que no coincide con nada es un **recurso ausente**: la
petición estuvo bien, el recurso no existe (`404 REQUEST_NOT_FOUND`). Son
preguntas distintas y por eso se conservan ambos.

**5. ¿Por qué validamos la prioridad en la aplicación si PostgreSQL ya tiene
una restricción?**
Porque son dos defensas de distinto nivel. La aplicación da el **contrato**:
un `400` claro y accionable, antes de tocar la base. La restricción CHECK
**protege la integridad** si la aplicación falla o si otro proceso escribe en
la tabla. Quitar la restricción para «resolver» el 500 sería esconder el
síntoma y perder la segunda defensa.

### Sobre el sistema

**6. ¿Qué responsabilidad tiene el middleware de errores?**
Ser el **único** lugar que convierte un error en una respuesta HTTP con el
formato del contrato (`{ error: { code, message }, requestId }`): traduce
categorías a estados, maneja JSON inválido, distingue la base inalcanzable
(`503`) y, para lo inesperado, responde un `500` genérico dejando el detalle
en el log.

**7. ¿Por qué debe registrarse después de las rutas?**
Porque un middleware de errores solo ve lo que ocurrió **antes** de él en la
cadena. Si va antes de las rutas, los errores de las rutas no pasan por él.

**8. ¿Qué permite un request ID que antes era imposible?**
Correlacionar las tres superficies de una misma petición: el header que ve el
cliente, el `requestId` del body de error y **la línea del log**. Antes,
«cinco 500 a la vez» eran líneas indistinguibles; ahora cada una tiene su id.

**9. ¿Qué información nunca debe aparecer en los logs? Nombra al menos
cuatro.** El header `Authorization` y el token (es una credencial viva), las
contraseñas y sus hashes, el body de la petición, la `DATABASE_URL`, y emails
completos por defecto. La lista de campos está en **allowlist**, no en
blocklist.

**10. ¿Diferencia entre `/health` y `/ready`, y quién usa cada respuesta?**
`/health` responde «el proceso está vivo» y **no** toca la base (si la base
cae, sigue en 200) — lo usa el orquestador para reiniciar el proceso.
`/ready` responde «¿puede atender tráfico ahora?» corriendo un `SELECT 1`
barato; si falla devuelve `503` deliberado — lo usa el balanceador para
**dejar de enviar tráfico** sin matar el proceso.

### Sobre la IA y sobre ti

**11. ¿Qué hipótesis propuso la IA?**
Que INC-701 era un `NaN` viajando a SQL como `bigint`, y que INC-702 era la
restricción CHECK de PostgreSQL actuando porque la aplicación no validaba la
prioridad.

**12. ¿Cómo la comprobaste o descartaste?**
Las convertí en causa **confirmada** solo tras ver el error técnico real:
`22P02 invalid input syntax for type bigint: "NaN"` y `violates check
constraint "requests_priority_check"`. Descarté, en cambio, la sugerencia
implícita de eliminar la restricción y la de usar `parseInt` para el id.

**13. ¿Qué duda conservas?**
Cómo generalizar la **redacción de campos sensibles** cuando haya muchos
loggers, para que un objeto de error inesperado no filtre datos por accidente
(aquí lo evita la allowlist del `request-logger`, pero quiero el patrón
escalable).

---

> **Lo que demostró esta guardia:** dejamos de adivinar. Reproduje los tres
> incidentes con evidencia, confirmé cada causa con el error técnico, corregí
> con el cambio mínimo (sin tocar el contrato ni la restricción), y verifiqué:
> `RESOLVED ×3`, `npm test` 39/39 y validador `PASSED 12/12`.
