# Test matrix — Entrega 03

> Fase 1: resultado **esperado** declarado. Fase 5: cada caso ejecutado con `curl` contra el
> proyecto corriendo, con el resultado **observado** (línea de estado literal y cuerpo).

| Caso                   | Petición                      | Estado previo | Resultado esperado | Resultado observado |
| ---------------------- | ----------------------------- | ------------- | ------------------ | ------------------- |
| Crear correctamente    | `POST /requests`              | —             | `201`              | _(pendiente)_ |
| Crear sin título       | `POST /requests`              | —             | `400`              | _(pendiente)_ |
| Consultar inexistente  | `GET /requests/999`           | —             | `404`              | _(pendiente)_ |
| Filtrar sin resultados | `GET /requests?status=closed` | —             | `200 []`           | _(pendiente)_ |
| Cambiar prioridad      | `PATCH /requests/1`           | `open`        | `200`              | _(pendiente)_ |
| Transición válida      | `PATCH /requests/1`           | `open`        | `200`              | _(pendiente)_ |
| Transición inválida    | `PATCH /requests/1`           | `open`        | `409`              | _(pendiente)_ |
| Modificar cerrada      | `PATCH /requests/1`           | `closed`      | `409`              | _(pendiente)_ |

| Caso | Petición | Estado previo | Resultado esperado | Resultado observado |
| ---- | -------- | ------------- | ------------------ | ------------------- |
| Filtro con valor desconocido | `GET /requests?status=abierta` | — | `400 UNKNOWN_FILTER` | _(pendiente)_ |
| PATCH sin campos modificables | `PATCH /requests/1` con `{"id": 7}` | `open` | `400 NOTHING_TO_UPDATE` | _(pendiente)_ |

> Nota sobre la fila **Transición inválida**: `PATCH /requests/1` desde `open` con body
> `{"status":"closed"}` debe dar `409 INVALID_STATUS_TRANSITION`. Si en cambio se pidiera
> `{"status":"in_progress"}`, daría `200`: el estado previo y el body deciden juntos, y ambos
> se anotan.

## Evidencia

_(Se completa en la fase 5 con las salidas de `curl -i` de las transiciones inválidas y de la
solicitud en estado terminal.)_

```txt

```
