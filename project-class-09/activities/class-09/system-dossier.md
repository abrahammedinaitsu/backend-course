# System dossier — Clase 09

Un solo expediente para todo el análisis del taller. Regla de oro: cada
afirmación cita su evidencia (archivo y función, prueba, tabla o salida de
comando) o se declara como duda en la sección 9. "El service maneja la
lógica" sin nombres no cuenta como inventario.

---

## 1. How the system starts

**Comando de arranque:** `npm run dev` → `node --watch src/server.js`
(script `dev` de `package.json`). En producción/entrega: `npm start` →
`node src/server.js`.

La cadena es mecánica y es lo primero que leí de un repo Node desconocido:
`package.json` (script) → `src/server.js` → `src/app.js`.

1. **`src/server.js`** ejecuta Node. Es lo único que abre un puerto:
   `import app from './app.js'; const PORT = Number(process.env.PORT ?? 3000);
   app.listen(PORT, ...)`. No conoce ninguna ruta.
2. **`src/app.js`** construye la aplicación: `const app = express()`, monta
   los middlewares globales y los módulos, y `export default app`.
3. **Lo que queda escuchando** es el servidor HTTP de `app.listen`.

**Por qué `server.js` y `app.js` están separados** (evidencia, no suposición):
las pruebas importan `app` sin `listen` — `test/request-detail.test.js`
hace `import app from '../src/app.js'` y usa `supertest(app)`. El puerto es
responsabilidad de `server.js`; la aplicación es montable sin red. Eso es
lo que permite que la suite corra sin levantar el servidor.

Evidencia: `package.json` (scripts `dev`/`start`), `src/server.js`,
`src/app.js`, `test/request-detail.test.js`.

## 2. Main components

| Componente | Archivo o recurso | Responsabilidad | Evidencia | Duda |
| --- | --- | --- | --- | --- |
| Punto de entrada | `src/server.js` | Abre el puerto y arranca la app | `app.listen(PORT)` | — |
| Construcción de la app | `src/app.js` | Monta middleware y módulos en orden | `app.use(...)` en secuencia | — |
| Router principal | `src/app.js` | Monta `/auth` y `/requests` | `app.use('/requests', authenticate, requestsRoutes)` | — |
| Módulos | `src/modules/{auth,requests,users}/` | Rutas, service, store y policy por dominio | carpetas de módulo | — |
| Middleware global | `src/middleware/*.js` | cors, request-id, request-logger, error-handler, not-found | imports de `app.js` | — |
| Autenticación | `src/middleware/authenticate.js` | Verifica el Bearer y crea `req.auth` | `verifyToken(token)` → `req.auth = {...}` | — |
| Autorización (policies) | `src/modules/requests/request.policy.js` | Decide QUÉ puede hacer el actor | `canViewRequest`, `canClaimRequest` | — |
| Services | `src/modules/requests/requests.service.js` | Coordina el caso de uso, aplica policy, define transacciones | `getRequest`, `getHistory`, `claimRequest` | — |
| Stores / acceso a datos | `src/modules/requests/requests.store.js` | SQL parametrizado y filas | `findById`, `findHistory`, `updateRequest` | — |
| Conexión PostgreSQL | `src/database/pool.js` | Pool único compartido | `export const pool = new Pool({...})` | — |
| Manejo de errores | `src/middleware/error-handler.js` | Único punto error→HTTP | tabla `CATEGORY_STATUS` | — |
| Logging | `src/logging/logger.js` | Una línea JSON por evento; allowlist de campos | `logger.info/error` | — |
| Health / readiness | `src/routes/health.routes.js` | `/health` (vivo) y `/ready` (útil) | dos handlers distintos | — |
| Pruebas | `test/*.test.js` + `test/helpers/` | Red de seguridad; datos únicos por corrida | 64 tests, helpers cleanup | — |
| Scripts operativos | `scripts/*.js` | doctor, migrate, seed, validadores | `package.json` scripts | — |
| Dependencias externas | `package.json` | express, pg, jose, dotenv (+ supertest dev) | bloque `dependencies` | — |

## 3. Request trace

Recorrido completo de `GET /requests/:id` — en orden, con archivo y función
en cada paso. Verificado abriendo cada archivo, no de memoria.

1. **Router:** `src/modules/requests/requests.routes.js` → `router.get('/:id', ...)`. Montado en `src/app.js` con `app.use('/requests', authenticate, requestsRoutes)`.
2. **Middlewares que atraviesa** (en el orden de `src/app.js`): `corsPolicy` → `requestId` → `requestLogger` → `express.json()` → `authenticate` (solo en `/requests`) → el router del módulo. Si no hay ruta, `notFound`; si algo lanza, `errorHandler`.
3. **Dónde se valida el parámetro `id`:** en la route, `parseIdParam(req.params.id)` de `src/http/parse-id.js` — antes de cualquier SQL.
4. **Dónde nace la identidad autenticada:** `src/middleware/authenticate.js` verifica el Bearer con `verifyToken` (`src/modules/auth/token.js`) y construye `req.auth = { userId: payload.sub, role: payload.role }`. Es la ÚNICA fuente de identidad confiable.
5. **Policy consultada (¿se consulta?):** la route llama a `getRequest(req.auth, id)` en `src/modules/requests/requests.service.js`. **Hoy NO consulta `canViewRequest`**: la función tiene un comentario `// TEMP(REQ-442): visibility check disabled` y devuelve el recurso sin preguntar por ownership. Eso es BUG-901. La policy `canViewRequest` (`src/modules/requests/request.policy.js`) existe y es correcta, pero este camino no la llama. (El hermano `getHistory`, sí.)
6. **Service:** `src/modules/requests/requests.service.js` → `getRequest(actor, id)`. Llama a `findById(id)` y mapea con `mapRequestRow`.
7. **Store y query:** `src/modules/requests/requests.store.js` → `findById(id, db = pool)` ejecuta `SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1` (parametrizada) y devuelve la fila o `null`.
8. **Transformación fila → JSON:** `src/modules/requests/request.mapper.js` → `mapRequestRow(row)`: de `snake_case` (SQL) a `camelCase` (contrato HTTP), exponiendo `assignedTo`, `createdBy`, `createdAt`, `updatedAt`.
9. **Respuesta y manejo de errores:** la route responde `res.status(200).json(...)`. Si la fila no existe, el service lanza `notFound(id)` (`AppError` categoría `resource`, código `REQUEST_NOT_FOUND`); Express 5 lo reenvía a `src/middleware/error-handler.js`, que traduce por categoría y añade `requestId`.
10. **Pruebas existentes que cubren este recorrido:** `test/request-detail.test.js` (401 sin token, 404 id inexistente, 200 del dueño con schema congelado, 200 del agente) — **y los dos `todo` que son la regresión de BUG-901**; `test/request-access-policy.test.js` (policy pura); `test/traceability.test.js`.

## 4. Database inventory

Mismo proyecto Supabase desde la clase 06 (esquema `class06`); las cinco
migraciones salen `SKIPPED` al correr `npm run db:migrate`.

| Tabla | Claves / restricciones relevantes | Migración | Evidencia |
| --- | --- | --- | --- |
| `users` | PK `id` (uuid), `email` único, `role` con CHECK (`requester`/`agent`) | `001_create_users.sql` | `scripts/seed.js` inserta 3 usuarios |
| `requests` | PK `id`, FK `created_by → users(id)`, `assigned_to → users(id)`, `status` y `priority` con CHECK | `002_create_requests.sql`, `005_add_request_assignment.sql` | `REQUEST_COLUMNS` del store |
| `request_history` | PK `id`, FK `request_id → requests(id)`, `changed_by → users(id)`, `type` con CHECK (`status_changed`/`priority_changed`/`request_claimed`) | `003_create_request_history.sql`, `005_add_request_assignment.sql` | `insertHistoryEvent` del store |

**Claves foráneas:** `requests.assigned_to → users(id)` garantiza que el
usuario EXISTE; no garantiza que sea agente (eso es la policy). El CHECK de
`request_history.type` fue AMPLIADO en 005, no editado en 003.

**Cómo se siembra:** `scripts/seed.js` (`npm run db:seed`) es repetible:
identifica a los usuarios `*.seed@example.test`, borra SOLO sus solicitudes
e historial y las recrea. Nunca trunca. Resultado en esta corrida: 3
usuarios, 6 solicitudes, 15 eventos, 1 ya asignada.

Evidencia: `database/migrations/001..005`, `scripts/seed.js`, salida de
`npm run db:migrate` (001-005 SKIPPED) y `npm run db:seed`.

## 5. Authentication and authorization

**Dónde se verifica el JWT:** `src/middleware/authenticate.js`. Exige el
esquema exacto `Bearer `, verifica el token con `verifyToken`
(`src/modules/auth/token.js`, librería `jose`) y responde `401
AUTHENTICATION_REQUIRED` (sin header) o `401 INVALID_TOKEN` (alterado,
expirado, firma/issuer/audiencia incorrectos — misma respuesta, sin decir
cuál falló).

**Qué contiene `req.auth`:** exactamente `{ userId: payload.sub, role:
payload.role }`, y solo si `payload.sub` es string y `payload.role` está en
`['requester','agent']`. Es la única identidad confiable; nunca se acepta
`userId`/`createdBy`/`assignedTo` del query o body.

**Dónde viven las reglas de permiso:** en
`src/modules/requests/request.policy.js`, funciones PURAS (sin Express, sin
SQL). Ejemplo de regla y su prueba:

* Regla: `canViewRequest(actor, request)` → `true` si el actor es `agent`,
  o si `request.createdBy === actor.userId`; en cualquier otro caso `false`.
* Prueba: `test/request-access-policy.test.js` construye `agent`, `owner` y
  `stranger` como objetos planos y comprueba los tres casos. Corre con
  `npm run test:policy`, en milisegundos, SIN `.env`.

## 6. Errors, logs and operational checks

**Formato de error y requestId:** `src/middleware/error-handler.js` produce
SIEMPRE `{ "error": { "code", "message" }, "requestId": "..." }`. El status
sale de la CATEGORÍA (`contract:400, auth:401, forbidden:403, resource:404,
domain:409`), no del punto que lanzó. El `requestId` lo crea
`src/middleware/request-id.js` y viaja igual en la respuesta y en el log.
Ejemplo real (reproducción del bug): `{"error":{"code":"REQUEST_NOT_FOUND",
"message":"Request 487 does not exist."},"requestId":"req_ff989d05-..."}`.

**Qué se registra en logs:** `src/middleware/request-logger.js` emite UNA
línea por request terminado con una allowlist explícita: `requestId`,
`method`, `path`, `status`, `durationMs`, `userId` (si autenticó) y
`errorCode` (si hubo). `src/logging/logger.js` escribe JSON a stdout/stderr.

**Qué JAMÁS se registra:** headers, bodies, tokens ni query strings — "lo
que no está en la allowlist no llega al log". El error-handler registra el
detalle interno (nombre, mensaje, stack) SOLO para errores inesperados, y
nunca la cadena de conexión (para `DATABASE_UNAVAILABLE` registra solo el
`code`).

**Diferencia `/health` vs `/ready`** (`src/routes/health.routes.js`):
`/health` responde `{status:'ok'}` y **nunca toca PostgreSQL** (liveness: un
probe que dependa de la base reportaría el proceso muerto cuando solo cayó
su dependencia). `/ready` ejecuta `SELECT 1` y responde `200
{status:'ready',database:'available'}` o `503
{status:'not_ready',database:'unavailable'}` — un 503 deliberado que no
revela hosts ni credenciales. Ambos cubiertos por `test/health.test.js`.

## 7. Minimum-practices audit

Clasificaciones permitidas: COMPLIES · PARTIAL · DOES_NOT_COMPLY ·
NOT_FOUND · NOT_UNDERSTOOD. Cada fila cita evidencia o reconoce duda.

| Área | Pregunta | Clasificación | Evidencia / duda |
| --- | --- | --- | --- |
| Configuración | ¿Los secretos están fuera del código? | COMPLIES | `DATABASE_URL`/`JWT_SECRET` llegan por `.env` (ignorado por `.gitignore`); `src/database/pool.js` los lee de `process.env` |
| Entrada | ¿Se validan datos externos? | COMPLIES | `parseIdParam` (`src/http/parse-id.js`), `assertValidPriority`, `rejectServerControlledFields` en el service |
| SQL | ¿Las consultas están parametrizadas? | COMPLIES | `requests.store.js`: todas las queries usan `$1..$n`; los identificadores salen del archivo, nunca del cliente |
| Identidad | ¿El JWT se verifica? | COMPLIES | `src/middleware/authenticate.js` → `verifyToken` (jose) antes de crear `req.auth` |
| Permisos | ¿Existe autorización además de autenticación? | COMPLIES | `src/modules/requests/request.policy.js` (canView, canEdit, canClaim…) consultadas desde el service |
| Ownership | ¿Se limita el acceso al propietario cuando corresponde? | DOES_NOT_COMPLY | **BUG-901**: `getRequest` NO llama a `canViewRequest` (`// TEMP(REQ-442)`); un requester lee solicitudes ajenas → 200 |
| Dominio | ¿Los campos del servidor están protegidos? | COMPLIES | `SERVER_CONTROLLED_FIELDS` + `rejectServerControlledFields` → `400 SERVER_CONTROLLED_FIELD` |
| Consistencia | ¿Las escrituras relacionadas usan transacción? | COMPLIES | `withTransaction` en `createRequest`, `patchRequest`, `claimRequest` (`src/database/transaction.js`) |
| Errores | ¿Existe un formato consistente? | COMPLIES | `src/middleware/error-handler.js`: `{ error:{code,message}, requestId }` para todo |
| Logs | ¿Ayudan a investigar sin exponer secretos? | COMPLIES | allowlist de `src/middleware/request-logger.js`; el error-handler no loguea la cadena de conexión |
| Pruebas | ¿Existen casos positivos y negativos? | PARTIAL | hay 59 casos verdes y negativos (401/404/400/409); pero el hueco de ownership quedó como `todo` sin convertir → por eso el bug pasó en silencio |
| Migraciones | ¿El esquema está versionado? | COMPLIES | `database/migrations/001..005` + ledger `schema_migrations`; 005 amplía el CHECK en vez de editar 003 |
| Seed | ¿Puede repetirse de forma controlada? | COMPLIES | `scripts/seed.js` borra solo lo suyo (`*.seed@example.test`) y recrea; nunca trunca |
| Arquitectura | ¿HTTP, reglas y SQL están separados razonablemente? | COMPLIES | route (sin SQL) · service (sin Express) · store (SQL) · policy (pura); verificado por el validador (checks 12-13) |
| Operación | ¿Health y readiness tienen propósitos distintos? | COMPLIES | `/health` no toca la base; `/ready` ejecuta `SELECT 1` y responde 503 si falla |

## 8. Change impact

Completa ANTES de modificar código. Commit: `class-09-analysis`.

### Observable behavior

**Cambia:** un `requester` que pide `GET /requests/:id` de una solicitud
AJENA pasa de `200` (con el cuerpo completo) a `404 REQUEST_NOT_FOUND`
—indistinguible de un id inexistente. **Reproducido con mis ojos** (ver
`work-log.md`): Ana (requester) leyendo la solicitud de Luis → hoy `200`;
el historial de esa misma solicitud → ya `404`.

**NO debe cambiar:** para el **dueño** sigue `200` con EXACTAMENTE el mismo
schema; para un **agente** sigue `200` de cualquier solicitud; sin token
sigue `401`; un id inexistente sigue `404`. Los endpoints vecinos
(`/requests`, `/requests/:id/history`, `/requests/:id/claim`, `PATCH`,
`POST`) no cambian.

### Files likely affected

* `src/modules/requests/requests.service.js` — `getRequest` (el fix: consultar la policy; borrar el comentario TEMP).
* `test/request-access-policy.test.js` — convertir los 3 `todo` de policy pura.
* `test/request-detail.test.js` — convertir los 2 `todo` de regresión (extraño → 404; `?userId=` → 404).
* `activities/class-09/system-dossier.md` — este análisis.
* (No tocados: `request.policy.js`, `requests.routes.js`, `requests.store.js`, `request.mapper.js`, migraciones.)

### Rule to protect

En una frase: **"un requester solo puede consultar las solicitudes que él
creó; un agente, cualquiera; y el que no puede ver recibe el mismo 404 que
si el recurso no existiera."** La regla YA existe en `canViewRequest`; el
problema es que el camino del detalle no la consulta.

### Data required

La regla necesita: el **rol** del actor y su **userId** (de `req.auth`, ya
en `getRequest(actor, id)`), y el **`createdBy`** de la solicitud (de la fila
de `findById`, ya mapeada por `mapRequestRow` como `request.createdBy`).
Todo está disponible en `getRequest` sin cambiar su firma ni pedir datos
nuevos: por eso el fix es mínimo.

### Status codes

| Caso | Antes | Después (contrato BUG-901) |
| --- | --- | --- |
| Sin token | 401 | 401 (igual) |
| Dueño (requester) leyendo lo suyo | 200 | 200 (igual) |
| Agente leyendo cualquier solicitud | 200 | 200 (igual) |
| **Requester ajeno leyendo la de otro** | **200 (bug)** | **404 `REQUEST_NOT_FOUND`** |
| Id inexistente | 404 | 404 (igual) |
| `?userId=<dueño>` con token ajeno | 200 (bug) | 404 |
| Recurso no visible vs inexistente | distintos | **indistinguibles** (mismo status, código y mensaje) |

La decisión `404` (no `403`) es una decisión EXPLÍCITA de este sistema para
no confirmar la existencia de recursos ajenos y reducir la enumeración de
IDs. **No es una regla universal** (otros sistemas responden 403). El
historial ya la aplica — comparado en la reproducción.

### Tests to add or change

* **Añadir (regresión, primero en rojo):** en `test/request-detail.test.js`, el extraño → 404 y el `?userId=` → 404. Deben verse FALLAR contra el bug (stash del fix) antes de pasar.
* **Añadir (policy pura):** en `test/request-access-policy.test.js`, convertir los 3 `todo`: agente ve todo, dueño ve lo suyo, extraño no ve.
* **No cambiar los tests activos** de `request-detail.test.js` (401, 404 inexistente, 200 dueño con schema congelado, 200 agente): son el "qué NO debe cambiar".

### Behavior that must remain unchanged

Dueño → 200 con el mismo schema (`assignedTo, createdAt, createdBy,
description, id, priority, status, title, updatedAt`); agente → 200;
sin token → 401; id inexistente → 404; `/requests/:id/history` (ya consulta
la policy); `/requests/:id/claim`; `PATCH /requests/:id` (ya llama a
`canViewRequest`); el listado `/requests` (scoping por SQL).

### Risks

* **Riesgo 1 — devolver 403 en vez de 404:** rompería la decisión
  anti-enumeración del sistema y la prueba que exige indistinguibilidad. Se
  evita llamando a la policy y reutilizando `notFound(id)`.
* **Riesgo 2 — bloquear al agente:** si el fix filtrara por dueño en el
  store, el agente recibiría 404 en casos válidos. Se evita NO tocando el
  SQL y dejando la decisión en la policy.
* **Riesgo 3 — duplicar la regla:** reescribir la visibilidad a mano en el
  service en vez de llamar a `canViewRequest`. Se evita llamando a la
  función existente.
* **Riesgo 4 — cambiar el schema del 200:** añadir/quitar campos al mapear.
  Se evita no tocando `request.mapper.js`.

### Unknowns

Declarados y llevados a la §9. Principal: no verifiqué si algún cliente
externo dependía del 200 indebido (no hay consumidores en el repo más allá
de las pruebas). Se resolvería revisando accesos reales, que no tengo.

## 9. Unknowns and questions

Esta sección NUNCA va vacía: un junior sin dudas no ha mirado suficiente.

1. **¿Por qué el `TEMP(REQ-442)` sobrevivió tanto?** El comentario dice
   "re-enable after the audit", pero no hay dueño ni fecha. ¿Qué proceso
   habría evitado que un parche temporal sin owner se volviera permanente?
   (Pregunta de proceso, no de código.)
2. **¿Algún cliente real dependía del 200 indebido?** El repo no tiene
   consumidores, pero en un sistema en producción el cambio de 200→404
   podría romper a alguien. ¿Cómo se comprueba antes de desplegar?
3. **`test/regression.test.js`: ¿qué vecinos críticos cubre exactamente?**
   Lo vi correr y pasar, y sé que es "la lista corta de vecinos", pero no
   he leído cada caso para poder decir cuál protege qué contrato.
4. **`/ready` y CORS:** no exploré cómo se comporta `/ready` detrás de un
   proxy con health-checks. ¿El 503 deliberado lo interpreta bien un
   orquestador? (No es parte del ticket; queda como duda.)
5. **Alternancia de `?userId=` en el listado:** confirmé que el detalle debe
   ignorarlo; no verifiqué si `/requests` acepta filtros no documentados
   más allá de `status`/`priority`/`createdBy` interno. Duda abierta.
