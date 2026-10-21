# Persistence contract — operaciones del store

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> Los contratos también existen entre módulos: este documento es la promesa del store
> hacia el service.

Operaciones: `findAll(filters)` · `findById(id)` · `create(input)` · `update(id, changes)` ·
`findHistory(requestId)`

---

## `findAll(filters)`

* **Entrada**: `{ status?, priority? }`. Valores válidos: `status` en los cinco estados,
  `priority` en `{low, medium, high}`. Los valores **inválidos ya se rechazaron en la ruta**
  (`400 UNKNOWN_FILTER`): el store recibe solo valores de la allowlist.
* **Consulta**: `SELECT` con **columnas explícitas**; las condiciones se acumulan en un
  arreglo `conditions` y los valores en `values`, numerando con `$${values.length}`. Sin
  filtros no hay `WHERE`; con uno o dos, se unen con `AND`.
* **Salida**: un **arreglo de filas** (`result.rows`). El store **no** mapea: quien lo llama
  decide. (Decisión: mantengo el mapper en la frontera HTTP para tener una sola traducción.)
* **Ausencia de datos**: `[]`. "¿Cuáles?" siempre tiene respuesta; vacío no es error.
* **Errores posibles**: fallo de conexión / base pausada (`503`), error SQL no identificado
  (`500`). Ambos se propagan al manejador central.
* **¿Necesita transacción?**: **No.** Una sola lectura, sin coordinación con otra escritura.
* **Mapeo**: en `requests.service.js` → `mapRequestRow` por cada fila (o el mapper en la ruta).

## `findById(id)`

* **Entrada**: `id` numérico (`Number(req.params.id)`).
* **Consulta**: `SELECT id, title, description, priority, status, created_at, updated_at
  FROM requests WHERE id = $1` — parametrizado.
* **Salida**: una fila o `null`.
* **Ausencia de datos**: **`null`** (con `rows[0] ?? null`). No es excepción: "no existe" es
  una respuesta válida (`404`), no un fallo de infraestructura (`503`). El store no habla
  HTTP; devuelve el contrato interno "fila o null".
* **Errores posibles**: infraestructura (`503`), SQL no identificado (`500`).
* **¿Necesita transacción?**: **No.** Lectura única.
* **Mapeo**: `mapRequestRow` en el service/ruta.

## `create(input)`

* **Entrada**: `{ title, description?, priority? }`. `id`, `status`, `createdAt`, `updatedAt`
  enviados por el cliente se **ignoran** (los controla el servidor/base).
* **Consulta(s)**: **dos escrituras**:
  1. `INSERT INTO requests (title, description, priority) VALUES ($1,$2,$3)
     RETURNING id, title, description, priority, status, created_at, updated_at`
     → la fila creada **en un solo viaje** (`RETURNING` evita el segundo `SELECT`).
     `status` y las fechas usan los `DEFAULT` de la tabla (`open`, `CURRENT_TIMESTAMP`).
  2. `INSERT INTO request_status_history (request_id, previous_status, new_status)
     VALUES ($1, NULL, 'open')` → registra el **nacimiento** (`NULL → open`).
* **Salida**: la fila creada (de la primera consulta), mapeada.
* **Errores posibles**: `title` demasiado largo → `CHECK`/`NOT NULL` → `500`; prioridad que
  pasó la validación de app pero viola el `CHECK` → `500`; infraestructura → `503`.
* **¿Necesita transacción?**: **Sí.** El nacimiento de la solicitud y su primer evento de
  historia son **una unidad lógica**: una solicitud no debe existir sin la fila que registra
  su nacimiento. Si el segundo `INSERT` falla, el primero debe revertirse.
* **Mapeo**: `mapRequestRow` sobre `rows[0]`.

## `update(id, changes)`

* **Entrada**: `{ id, changes }`. `changes` tiene solo campos modificables ya validados por
  el service (`title`, `description`, `priority`). Un cambio de `status` **no se resuelve
  aquí solo**: usa la ruta transaccional dedicada (ver abajo).
* **Consulta(s)**: para un cambio **sin** estado:
  `UPDATE requests SET <campos>, updated_at = CURRENT_TIMESTAMP WHERE id = $n
  RETURNING …`. Para un cambio **con** estado: la unidad transaccional de dos escrituras
  (`UPDATE requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING …`
  + `INSERT INTO request_status_history (request_id, previous_status, new_status) VALUES (…)`),
  en **un solo cliente**, con `BEGIN`/`COMMIT`/`ROLLBACK`/`release`.
* **Salida**: la fila actualizada.
* **Ausencia de datos**: `null` si `rows.length === 0` (la fila no existe / desapareció).
* **Errores posibles**: violación de `CHECK` de estado → no debería ocurrir (la app valida
  antes) → `500` si ocurre; conflicto de transición → **lo decide el service** (`409`), no el
  store; infraestructura → `503`.
* **¿Necesita transacción?**: **Solo cuando cambia el estado** (dos escrituras). Un cambio de
  solo `title`/`priority`/`description` es un único `UPDATE`: no necesita transacción.
* **Mapeo**: `mapRequestRow` sobre `rows[0]`.

## `findHistory(requestId)`

* **Entrada**: `requestId` numérico.
* **Consulta**: `SELECT id, request_id, previous_status, new_status, changed_at
  FROM request_status_history WHERE request_id = $1 ORDER BY changed_at, id`.
* **Salida**: arreglo de filas de historia (el service las mapea a
  `{ previousStatus, newStatus, changedAt }`).
* **Ausencia de datos**: el store devuelve `[]`. **Quién distingue** "solicitud inexistente"
  de "historial vacío" es el **service**: primero consulta `findById`; si no existe → `404`;
  si existe y la historia viene vacía → `200 []`. El store no puede distinguirlo con una sola
  consulta sin hablar de HTTP.
* **Errores posibles**: infraestructura (`503`), SQL no identificado (`500`).
* **¿Necesita transacción?**: **No.** Lectura única.
* **Mapeo**: `mapHistoryRow` en el service.
