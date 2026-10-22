# Class 08 evidence — para el checkpoint de la PRÓXIMA clase

El tema 8 NO se evalúa hoy: primero se aprende y se practica. Al comenzar la
próxima clase se ejecutará un checkpoint breve SOLO del tema 8. Este archivo
reúne desde ya la evidencia que ese checkpoint pedirá.

## Evidencia mínima del tema 8

* **Baseline anterior al refactor** (commit `class-08-baseline`): `04dc625`.
  Antes de tocar código: `class-08:doctor` 7/7, `db:migrate` con 001-004
  `SKIPPED` y `005` `APPLIED`, seed con 1 solicitud ya asignada, y suite
  `39 pass, 13 todo, 0 fail`. El estado del validador en el baseline era
  `FAILED (3/12)` (faltaba el claim y el check de frontera 11).
* **Commits separados de refactor y feature**: `class-08-refactor` =
  `386e8ee`; `class-08-feature` = `28ba2fc`.
* **`responsibility-map.md` completo**: sí. Clasifica los seis bloques del
  handler `GET /:id/history` (HTTP, aplicación, negocio, persistencia,
  presentación, observabilidad), responde las tres preguntas del análisis y
  concluye que el handler tenía **cinco razones para cambiar** y **duplicaba
  cinco piezas** que ya existían.
* **Separación route/service/store/policy**: dónde quedó cada responsabilidad.
  * **route** (`requests.routes.js`): solo traduce HTTP. `parseIdParam` valida
    el id, llama al service y responde. Cero SQL, cero reglas.
  * **service** (`requests.service.js`): coordina el caso de uso. `getHistory`
    y `claimRequest` orquestan: leer, aplicar la policy, escribir y registrar
    historial dentro de una transacción. No conoce Express.
  * **store** (`requests.store.js`): solo SQL parametrizado y filas.
    `findById`, `findHistory`, `assignRequest`, `insertHistoryEvent`.
  * **policy** (`request.policy.js`): reglas puras sobre objetos planos.
    `canViewHistory` y `canClaimRequest` (devuelve `{ allowed, reason }`).
  * **mapper** (`request.mapper.js`): única frontera SQL→HTTP.
    `mapRequestRow` (expone `assignedTo`) y `mapHistoryEventRow`.
* **Migración de assignment aplicada (005)**: `db:migrate` →
  `[APPLIED] 005_add_request_assignment.sql` con `001-004` en `[SKIPPED]`.
  La 005 **amplía**: agrega la columna `assigned_to UUID REFERENCES users(id)`,
  el índice `idx_requests_assigned_to`, y reemplaza el CHECK de
  `request_history.type` por uno más amplio que incluye `request_claimed`.
  **No se editó ninguna migración anterior.**
* **Endpoint claim funcionando**: `POST /requests/:id/claim` sin body. Se
  demuestra con las 8 pruebas de API (`test/requests-claim.test.js`) que
  cubren la matriz completa, y con el validador (checks 03-10, todos `PASS`).
  Un agente sobre una solicitud `open` y sin asignar recibe `200` con
  `assignedTo` **igual al id del token** y `status: "in_progress"`.
* **Historial y transacción consistentes**: el claim produce un evento
  `request_claimed` con `fromStatus: "open"` y `toStatus: "in_progress"`, y
  la asignación (`assignRequest`) y ese evento (`insertHistoryEvent`) se
  ejecutan con **el mismo `client`** dentro de `withTransaction`: o ambos
  ocurren, o ninguno (rollback). La prueba 8 de API y el check 10 del
  validador lo comprueban leyendo el historial por HTTP.
* **Pruebas de policy (sin HTTP) y de API**: 
  * `test/request-policy.test.js` → 7 pruebas puras, **sin base ni HTTP**,
    en milisegundos (`npm run test:policy`).
  * `test/requests-claim.test.js` → 8 pruebas de API con la matriz completa.
  * Suite total: **54 pass, 0 todo, 0 fail** (baseline: 39 pass, 13 todo).
    Los 13 stubs se convirtieron; los 2 tests extra de policy cubren el orden
    de las reglas (el rol gana sobre el estado; asignado gana sobre no-open).
* **Resultado del validador**: `FINAL RESULT: PASSED` (12/12), corrido dos
  veces consecutivas. La evidencia completa está en
  `activities/class-08/validation-evidence.txt`.
* **Decisiones de diseño**:
  * `assignedTo` **jamás** viene del body: si el body lo intenta enviar, se
    responde `400 SERVER_CONTROLLED_FIELD` (hacer visible el contrato en vez
    de ignorarlo en silencio).
  * Se usa `POST` con sustantivo verbal (`claim`) y no un `PATCH` genérico:
    es una acción con intención, identidad derivada por el servidor, varias
    reglas y un efecto (historial).
  * La FK de `assigned_to` **garantiza que el usuario existe**, pero **no**
    que sea un agente: esa regla vive en la policy (`canClaimRequest`),
    donde los roles son conocidos y testeables.
  * La distinción de motivos del claim es explícita: `NOT_AGENT` → `403`,
    `ALREADY_ASSIGNED` → `409 REQUEST_ALREADY_ASSIGNED`, `NOT_OPEN` →
    `409 REQUEST_NOT_CLAIMABLE`.

## Explicación integradora (refactor vs funcionalidad nueva)

En este día hubo **dos trabajos distintos**, y la separación se ve en el diff:

**Refactor** (commit `class-08-refactor`, `04dc625 → 386e8ee`). El handler
`GET /:id/history` hacía todo por sí mismo. No cambié su comportamiento: moví
cada responsabilidad a la capa que ya existía para ella. La **regla de
visibilidad** fue a `canViewHistory` en la policy; la **coordinación** a
`getHistory` en el service; el **SQL** a `findById`/`findHistory` en el store;
el **mapeo** a `mapHistoryEventRow` en el mapper; el **formato del id** a
`parseIdParam`. La prueba de que fue un refactor y no un cambio de contrato es
que la suite quedó **idéntica** (`39 pass, 13 todo, 0 fail`) antes y después,
y que las 6 pruebas de historial siguieron verdes. El check de frontera 11 del
validador pasó de `FAIL` a `PASS`.

**Funcionalidad nueva** (commit `class-08-feature`). Sobre esa estructura ya
ordenada, FEATURE-801 fue **agregar**, no reescribir. Una **regla** en la
policy (`canClaimRequest`, pura, con tres motivos de denegación); una
**coordinación** en el service (`claimRequest`, que traduce esos motivos a
`AppError` y abre la transacción); una **operación SQL** en el store
(`assignRequest`, que escribe `assigned_to` y el nuevo `status` juntos, más el
evento de historial con el mismo `client`); una **route delgada**
(`POST /:id/claim`); y una **migración compatible** (005, que amplía el esquema
sin tocar las anteriores).

Cómo lo demostraron las pruebas: la policy se probó con objetos planos (7
assertions, sin base), de modo que las tres reglas se verifican sin HTTP; la
transacción se probó de dos formas — por API (el historial contiene
`request_claimed` tras el claim) y por el validador (check 10). Y, sobre todo,
una prueba de **frontera** verifica que la route no contiene SQL y que el
service no conoce Express: la organización que el refactor logró es la que
permite que el feature se agregue sin volver a mezclar responsabilidades.
