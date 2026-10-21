# Query matrix — Entrega 04

> Fase 1 · cada operación con su SQL (parametrizado) y sus parámetros. El SQL de esta
> matriz debe coincidir con el que termine en el store — si divergen, actualiza la matriz.

| Operación | SQL | Parámetros | Resultado esperado |
| --------- | --- | ---------- | ------------------ |
| Listar | `SELECT id, title, description, priority, status, created_at, updated_at FROM requests` | — | Filas |
| Buscar por ID | `SELECT id, title, description, priority, status, created_at, updated_at FROM requests WHERE id = $1` | `[id]` | Fila o ausencia |
| Crear (solicitud) | `INSERT INTO requests (title, description, priority) VALUES ($1, $2, $3) RETURNING id, title, description, priority, status, created_at, updated_at` | `[title, description, priority]` | Fila creada |
| Filtrar estado | `SELECT … FROM requests WHERE status = $1` | `[status]` | Colección |
| Filtrar prioridad | `SELECT … FROM requests WHERE priority = $1` | `[priority]` | Colección |
| Filtrar combinado | `SELECT … FROM requests WHERE status = $1 AND priority = $2` | `[status, priority]` | Colección |
| Actualizar (sin estado) | `UPDATE requests SET title = $1, description = $2, priority = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, title, description, priority, status, created_at, updated_at` | `[title, description, priority, id]` | Fila actualizada |
| Actualizar (estado) | `UPDATE requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, description, priority, status, created_at, updated_at` | `[newStatus, id]` | Fila actualizada |
| Registrar nacimiento | `INSERT INTO request_status_history (request_id, previous_status, new_status) VALUES ($1, NULL, $2)` | `[requestId, 'open']` | Fila de historia |
| Registrar transición | `INSERT INTO request_status_history (request_id, previous_status, new_status) VALUES ($1, $2, $3)` | `[requestId, previousStatus, newStatus]` | Fila de historia |
| Consultar historia | `SELECT id, request_id, previous_status, new_status, changed_at FROM request_status_history WHERE request_id = $1 ORDER BY changed_at, id` | `[requestId]` | Eventos |

> Nota sobre el `UPDATE` sin estado: en la implementación final el store recibe **solo los
> campos presentes** y arma el `SET` dinámicamente, pero **siempre** con los valores en la
> columna de parámetros (nunca concatenados) y **siempre** con `updated_at = CURRENT_TIMESTAMP`.
> Los nombres de columna del `SET` provienen de una **allowlist del código**, jamás del cliente.

## Comprobación de seguridad

Reviso la columna SQL de arriba: **ningún valor del cliente aparece dentro del texto de la
consulta.** Todos viajan como `$1`, `$2`, `$3`… en el arreglo de parámetros. Los únicos
identificadores que aparecen en el SQL son **nombres de columna fijos** escritos por mí.

Dos reglas que respeto:

- **Valores → parametrizados** siempre (`$n`).
- **Identificadores (columnas/tablas) → allowlist del código**, nunca del cliente. Si algún
  día se agrega ordenamiento (`?sort=`), los campos válidos serán una lista cerrada
  (`title`, `created_at`, …) validada antes de tocar el SQL.

Las columnas se **seleccionan explícitamente** (nunca `SELECT *`): así la representación no
cambia sola si alguien agrega una columna. Y el cliente **no envía** `id`, `createdAt` ni
`updatedAt`: los genera la base.
