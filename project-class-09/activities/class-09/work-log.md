# Work log — Clase 09 (taller, Fase B)

Registro del trabajo con IA durante el TALLER (la evaluación de la Fase A
tiene su propio historial obligatorio en `assessment/`). Aquí va el
CRITERIO, no el chat.

## What I observed before asking AI

Antes de preguntarle nada a la IA ya tenía, con mis propias manos:

* **El sistema corriendo:** `npm run doctor` → 7/7; `npm run db:migrate` →
  `[SKIPPED] 001..005` (el esquema es el mismo desde la clase 06);
  `npm run db:seed` → 3 usuarios, 6 solicitudes, 15 eventos, 1 asignada;
  `npm test` → **59 pass, 5 todo, 0 fail**.
* **BUG-901 reproducido** con dos requesters reales del seed (Ana y Luis),
  por API en `http://127.0.0.1:3004`:

  ```
  PASO 1  Luis lee SU solicitud (id=487)            -> HTTP 200   (correcto)
  PASO 2  Ana (requester AJENA) lee la de Luis      -> HTTP 200   (BUG)
  PASO 3  Ana lee el HISTORIAL de la de Luis        -> HTTP 404   (contraste)
  PASO 4  Ana lee un id inexistente (999999999)     -> HTTP 404   (referencia)
  ```

  Ambas salidas 404 traen el MISMO cuerpo
  `{"error":{"code":"REQUEST_NOT_FOUND","message":"Request ... does not exist."},"requestId":"..."}`.
  Ahí vi la **asimetría**: el historial consulta la policy; el detalle no.
* **El código señalado:** `src/modules/requests/requests.service.js`,
  función `getRequest`, con el comentario
  `// TEMP(REQ-442): visibility check disabled while support compares
  duplicate reports across requesters. Re-enable after the audit.` La
  función devuelve `mapRequestRow(row)` SIN llamar a `canViewRequest`. La
  hermana `getHistory` sí la llama.

## What I asked

1. "Tengo estas dos funciones del service, `getRequest` y `getHistory`. ¿En
   qué se diferencian en el paso de autorización?" (pegué SOLO esas dos
   funciones, no el repo entero).
2. "¿`canViewRequest` está rota o está ignorada en el camino del detalle?
   Justifica con las pruebas de policy."
3. "¿Qué cuatro arreglos INCORRECTOS son tentadores aquí y por qué cada uno
   rompe algo?" (para alimentar "What I rejected").

## What the AI proposed

* Confirmó la asimetría: `getHistory` llama a `canViewHistory` (que delega
  en `canViewRequest`); `getRequest` no consulta ninguna policy.
* Propuso el fix mínimo: en `getRequest`, tras `mapRequestRow(current)`,
  añadir `if (!canViewRequest(actor, request)) throw notFound(id);` y
  borrar el comentario TEMP.
* Para las pruebas: convertir los `todo` de `test/request-access-policy.test.js`
  (policy pura) y los de `test/request-detail.test.js` (extraño → 404;
  `?userId=` → 404).
* Al pedirle los anti-fixes, listó: (a) filtrar por dueño en el store,
  (b) devolver 403, (c) fix en la ruta, (d) crear un `AccessGuard`.

## Evidence I checked

Archivo por archivo, verificando cada afirmación contra el código real:

* `src/modules/requests/requests.service.js` — confirmé que `getRequest`
  no llama a `canViewRequest` y que `getHistory` sí llama a
  `canViewHistory`. (Afirmación de la IA: verificada.)
* `src/modules/requests/request.policy.js` — `canViewRequest` es correcta
  (`agent` → true; si no, `request.createdBy === actor.userId`) y
  `canViewHistory` delega en ella. La policy NO está rota. (Verificada.)
* `test/request-access-policy.test.js` — los 3 `todo` describen exactamente
  los tres casos; convertirlos corre sin `.env`. (Verificada.)
* `test/request-detail.test.js` — los tests activos congelan el schema del
  200; los 2 `todo` son la regresión del ticket. (Verificada.)
* `test/request-history.test.js`/`requests-history.test.js` — el historial
  ya responde 404 al extraño (coincide con el PASO 3 de mi reproducción).
* `database/migrations/005_add_request_assignment.sql` — confirmé que el
  CHECK de `request_history.type` se AMPLÍA ahí, no se edita en 003.

## What I accepted

* **El fix mínimo** en `getRequest`: llamar a la policy existente y borrar
  el TEMP. Lo acepté porque cumple la pista del ticket ("puede que ya
  exista — la pregunta es quién la consulta") y no crea capas nuevas.
* **El reuso de `notFound(id)`** para el 404 del ajeno: da indistinguibilidad
  gratis (mismo status, código y mensaje que el inexistente), que es la
  decisión explícita del sistema.
* **Convertir primero los `todo` de policy** (puros, sin infraestructura) y
  después los de API.

## What I rejected

* **Filtrar por dueño en el store (`WHERE created_by = actor`):** rompe al
  agente, que legítimamente ve solicitudes ajenas — el path del agente
  devolvería 404 en casos válidos, o habría que duplicar la query. Rechazado.
* **Devolver 403 en vez de 404:** contradice la decisión anti-enumeración
  del ticket Y la prueba que exige indistinguibilidad. Rechazado.
* **Crear un `AccessGuard`/middleware nuevo:** el módulo ya tiene route,
  service, policy, store y mapper; el problema no pide una capa nueva. El
  ticket lo prohíbe explícitamente. Rechazado.
* **El fix en la ruta (`requests.routes.js`):** pondría una regla de negocio
  en la capa HTTP, justo lo que la arquitectura separa. Rechazado.
* **Duplicar la lógica de visibilidad** en el service en vez de llamar a
  `canViewRequest`: bifurcaría la regla. Rechazado.

## What I changed

* `src/modules/requests/requests.service.js` — en `getRequest`: borrado el
  comentario `TEMP(REQ-442)` y añadido
  `if (!canViewRequest(actor, request)) throw notFound(id);`.
* `test/request-access-policy.test.js` — los 3 `todo` convertidos en pruebas
  puras reales.
* `test/request-detail.test.js` — los 2 `todo` convertidos (extraño → 404
  indistinguible; `?userId=` → 404).
* (Sin cambios en politica, store, mapper, rutas ni migraciones.)

## How I verified it

* **Rojo antes de verde:** con el fix apartado (`git stash`), el extraño daba
  `200` y la prueba de regresión FALLABA. Con `git stash pop`, pasa. (El
  ciclo stash→rojo→pop→verde demuestra que la prueba detecta el bug.)
* **Policy pura:** `npm run test:policy` en verde, sin `.env`.
* **Suite completa:** `npm test` → **64 pass, 0 todo, 0 fail**.
* **Validador:** `npm run validate:class-09` → **FINAL RESULT: PASSED (14/14)**.
* **Reproducción manual post-fix:** Ana vuelve a pedir la solicitud de Luis →
  ahora `404` indistinguible; Luis sigue `200`; el agente sigue `200`.

## What I still cannot explain

* Por qué el parche `TEMP(REQ-442)` sobrevivió: no hay dueño ni fecha, y
  ninguno de los `todo` de prueba lo atrapaba. (Va a la §9 del dossier.)
* Si algún consumidor real dependía del `200` indebido. No tengo accesos
  reales para comprobarlo. (Duda declarada, §9.)
* El detalle completo de qué protege cada caso de `test/regression.test.js`:
  lo vi pasar, pero no leí cada uno para poder explicarlo sin el archivo
  delante. (Duda declarada, §9.)

---

## Nota sobre el uso de IA (Fase B)

La IA se usó como ASISTENTE: le pegué funciones concretas (no el repo), me
confirmó una asimetría que yo YA había observado con curl, y propuso un fix
y cuatro anti-fixes. **Las decisiones fueron mías**: acepté el fix mínimo y
rechacé con razones el filtro en el store, el 403, el AccessGuard y el fix
en la ruta. La verificación (reproducción, ciclo rojo-verde, suite y
validador) la corrí yo. El diff final cabe en dos líneas de código más las
pruebas — porque el bug no era "escribir una regla" sino "volver a
llamarla".
