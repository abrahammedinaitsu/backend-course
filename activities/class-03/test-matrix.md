# Test matrix — Entrega 03

> Fase 1: resultado **esperado** declarado. Fase 5: cada caso ejecutado con `curl` contra el
> proyecto corriendo, con el resultado **observado** (línea de estado literal y cuerpo).

| Caso                   | Petición                      | Estado previo | Resultado esperado | Resultado observado |
| ---------------------- | ----------------------------- | ------------- | ------------------ | ------------------- |
| Crear correctamente    | `POST /requests`              | —             | `201`              | `201` + objeto con `id`, `status:"open"`, fechas |
| Crear sin título       | `POST /requests`              | —             | `400`              | `400` `TITLE_REQUIRED` |
| Consultar inexistente  | `GET /requests/999`           | —             | `404`              | `404` `REQUEST_NOT_FOUND` |
| Filtrar sin resultados | `GET /requests?status=closed` | —             | `200 []`           | `200` `[]` |
| Cambiar prioridad      | `PATCH /requests/1`           | `open`        | `200`              | `200` + prioridad actualizada |
| Transición válida      | `PATCH /requests/1`           | `open`        | `200`              | `200` (`open → in_progress`) |
| Transición inválida    | `PATCH /requests/2`           | `in_progress` | `409`              | `409` `INVALID_STATUS_TRANSITION` |
| Modificar cerrada      | `PATCH /requests/1`           | `closed`      | `409`              | `409` `REQUEST_IN_TERMINAL_STATUS` |

| Caso | Petición | Estado previo | Resultado esperado | Resultado observado |
| ---- | -------- | ------------- | ------------------ | ------------------- |
| Filtro con valor desconocido | `GET /requests?status=abierta` | — | `400 UNKNOWN_FILTER` | `400` `UNKNOWN_FILTER` |
| PATCH sin campos modificables | `PATCH /requests/1` con `{"id": 7}` | `open` | `400 NOTHING_TO_UPDATE` | `400` `NOTHING_TO_UPDATE` |
| Filtro combinado | `GET /requests?status=open&priority=low` | — | `200` + coincidencias | `200` + solo la solicitud `open`/`low` |
| Campos del servidor en POST | `POST /requests` con `status:"closed"`, `id:999` | — | `201`, campos ignorados | `201`, `status:"open"`, `id` generado |

> Nota sobre la fila **Transición inválida**: `PATCH /requests/1` desde `open` con body
> `{"status":"closed"}` da `409 INVALID_STATUS_TRANSITION`. Si en cambio se pidiera
> `{"status":"in_progress"}`, daría `200`: el estado previo y el body deciden juntos.

## Evidencia

Salidas de `curl -i` de la transición inválida y de la solicitud en estado terminal (prueba de
que las reglas están protegidas), más el filtro con valor desconocido.

```txt
# Transición inválida: in_progress -> closed
$ curl -i -X PATCH http://localhost:3000/requests/2 \
    -H "Content-Type: application/json" -d '{"status":"closed"}'
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{"error":{"code":"INVALID_STATUS_TRANSITION","message":"Cannot change status from in_progress to closed"}}

# Solicitud en estado terminal: se llevó la #1 a closed y se intentó modificar el título
$ curl -i -X PATCH http://localhost:3000/requests/1 \
    -H "Content-Type: application/json" -d '{"title":"try to change"}'
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{"error":{"code":"REQUEST_IN_TERMINAL_STATUS","message":"Request is closed and cannot be modified"}}

# Filtro con valor desconocido
$ curl -i "http://localhost:3000/requests?status=abierta"
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":{"code":"UNKNOWN_FILTER","message":"Unknown status filter: abierta"}}

# PATCH sin campos modificables
$ curl -i -X PATCH http://localhost:3000/requests/1 \
    -H "Content-Type: application/json" -d '{"id":7}'
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":{"code":"NOTHING_TO_UPDATE","message":"No modifiable fields in the body"}}

# Crear con campos del servidor (status/id) enviados: se ignoran
$ curl -i -X POST http://localhost:3000/requests \
    -H "Content-Type: application/json" -d '{"title":"Ignore server fields","status":"closed","id":999,"priority":"low"}'
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Ignore server fields","status":"open","priority":"low","createdAt":"2026-10-21T00:35:18.400Z","updatedAt":"2026-10-21T00:35:18.400Z"}
```
