# Test matrix — Entrega 04

> Fase 1: se declara lo **esperado**. Fase 6: cada caso se ejecuta y se registra lo
> **observado** (línea de estado literal y cuerpo). La columna observado se llenó ejecutando.

| Caso | Estado previo | Acción | Esperado | Observado |
| ---- | ------------- | ------ | -------- | --------- |
| Conectar correctamente | Proyecto activo | `npm run db:check` | Éxito | `✓ Conexión establecida` · Base de datos: `postgres` · Motor: `PostgreSQL 17.11` |
| Crear solicitud | — | `POST /requests` | `201` | `HTTP/1.1 201 Created` + `{"id":7,…,"status":"open",…}` |
| Reiniciar servidor | Solicitud creada | `GET /requests/:id` | Persiste | `HTTP/1.1 200 OK` + mismos datos del `201` (ver evidencia) |
| Buscar inexistente | — | `GET /requests/999` | `404` | `404` + `{"error":{"code":"REQUEST_NOT_FOUND",…}}` |
| Filtrar sin resultados | — | `GET ?status=closed` | `200 []` | `200` + `[]` |
| Cambiar prioridad | `open` | `PATCH /requests/1 {"priority":"low"}` | `200` | `200` + `priority:"low"`, `updatedAt` renovado |
| Transición válida | `open` | `PATCH /requests/1 {"status":"in_progress"}` | `200` | `200` + `status:"in_progress"` |
| Transición inválida | `open` | `PATCH /requests/2 {"status":"closed"}` | `409` | `HTTP/1.1 409 Conflict` + `INVALID_STATUS_TRANSITION` |
| Consultar historia | Transición hecha | `GET /requests/1/history` | `200` | `200` + 2 eventos (`null→open`, `open→in_progress`) |
| Falla del historial | `open` | Cambio transaccional con fallo inyectado | Rollback | `500 PERSISTENCE_CONSTRAINT`; `requests` quedó intacta (ver evidencia) |
| Base no disponible | — | Cualquier consulta (host inalcanzable) | Error consistente | `HTTP/1.1 503 Service Unavailable` + `DATABASE_UNAVAILABLE`; la API siguió viva |
| Reinicio de Express | Datos existentes | Consultar | Datos conservados | `200` con los mismos datos y la historia completa |

> Casos propios (mínimo dos; agregué cinco):

| Caso | Estado previo | Acción | Esperado | Observado |
| ---- | ------------- | ------ | -------- | --------- |
| `status` enviado al crear | — | `POST` con `status:"closed"`, `id:999` | `201`, campos ignorados | `201` + `status:"open"`, `id` generado por la base |
| Body sin campos modificables | `open` | `PATCH` con `{"id":7}` | `400 NOTHING_TO_UPDATE` | `400` + `NOTHING_TO_UPDATE` |
| Filtro combinado | — | `GET ?status=open&priority=high` | `200` + solo coincidencias | `200` + solicitudes `open`/`high` |
| Modificar solicitud terminal | `closed` | `PATCH /requests/2 {"title":"x"}` | `409 REQUEST_IN_TERMINAL_STATUS` | `409` + `REQUEST_IN_TERMINAL_STATUS` |
| History de inexistente | — | `GET /requests/999/history` | `404` | `404` + `REQUEST_NOT_FOUND` |

> Nota sobre la **Transición inválida**: `open → closed` da `409` porque una transición de un
> salto no existe en el mapa. `open → in_progress` sí da `200`. El estado previo y el body
> deciden juntos.

## Evidencia clave (texto, sin secretos)

### Persistencia tras reinicio

_(El 201 con su id → el reinicio → el 200 posterior. Nunca la URL de conexión.)_

```txt
# ANTES — se crea la solicitud y se anota su id
$ curl -i -X POST http://localhost:3000/requests \
    -H "Content-Type: application/json" \
    -d '{"title":"Persist across restart","description":"Format kind: creation number 99 for demo.","priority":"medium"}'
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":6,"title":"Persist across restart","description":"Format kind: creation number 99 for demo.","priority":"medium","status":"open","createdAt":"2026-10-21T01:38:49.427Z","updatedAt":"2026-10-21T01:38:49.427Z"}

# REINICIO — se detiene y vuelve a arrancar Express (Ctrl+C / Stop-Process node; node src/server.js)
#   Request API is running on http://localhost:3000

# DESPUÉS — el mismo id responde con los MISMOS datos
$ curl -i http://localhost:3000/requests/6
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":6,"title":"Persist across restart","description":"Format kind: creation number 99 for demo.","priority":"medium","status":"open","createdAt":"2026-10-21T01:38:49.427Z","updatedAt":"2026-10-21T01:38:49.427Z"}

# La historia también sobrevive al reinicio
$ curl -i http://localhost:3000/requests/2/history
HTTP/1.1 200 OK
[{"previousStatus":null,"newStatus":"open","changedAt":"2026-10-21T01:38:03.970Z"},
 {"previousStatus":"open","newStatus":"in_progress","changedAt":"2026-10-21T01:38:40.409Z"},
 {"previousStatus":"in_progress","newStatus":"resolved","changedAt":"2026-10-21T01:38:41.059Z"},
 {"previousStatus":"resolved","newStatus":"closed","changedAt":"2026-10-21T01:38:41.705Z"}]
```

### Rollback demostrado

_(Fallo controlado dentro de la transacción, la respuesta de error, y la consulta que muestra el
estado intacto. Documentado y luego revertido.)_

Cómo lo provoqué: el store tiene un gancho temporal `INJECT_HISTORY_FAILURE` (apagado por
defecto) que, al activarse, lanza un fallo simulado **justo entre el `UPDATE` y el `INSERT` de
historia**. Se arranca el servidor con la variable en `true`, se intenta el cambio de estado, y
se observa que **nada** cambia en la base.

```txt
# Estado ANTES del fallo: la solicitud 3 está en open con 1 evento de historia
 id | status
----+--------
  3 | open
 eventos = 1

# Fallo controlado: transición open -> in_progress, con INJECT_HISTORY_FAILURE=true
$ curl -i -X PATCH http://localhost:3000/requests/3 \
    -H "Content-Type: application/json" -d '{"status":"in_progress"}'
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{"error":{"code":"PERSISTENCE_CONSTRAINT","message":"The data store rejected an operation due to an integrity constraint."}}

# Estado DESPUÉS: el UPDATE se descartó por ROLLBACK
 id | status |         updated_at
----+--------+----------------------------
  3 | open   | 2026-10-21T01:38:03.970Z   <- mismo updated_at que antes
 id | previous_status | new_status
----+-----------------+------------
  1 | null            | open        <- sigue habiendo 1 solo evento
```

El `status` volvió a `open`, el `updated_at` **no cambió** (prueba de que el `UPDATE`
provisional se revirtió) y la historia quedó intacta: **la base no cuenta una historia a
medias**.

**Revertido:** el gancho es una variable de entorno; se detuvo el servidor con la inyección, se
volvió a arrancar sin `INJECT_HISTORY_FAILURE` (apagado por defecto) y la transición normal
vuelve a funcionar. El código del gancho queda documentado y desactivado, no roto.

### Base no disponible (503)

```txt
# Se arranca Express apuntando a un host inalcanzable (solo para la prueba)
$ curl -i http://localhost:3000/requests
HTTP/1.1 503 Service Unavailable
Content-Type: application/json; charset=utf-8

{"error":{"code":"DATABASE_UNAVAILABLE","message":"The service cannot access its data store."}}

# La API NO murió: la siguiente petición también responde 503 ordenadamente
$ curl -o NUL -w "%{http_code}" http://localhost:3000/requests/1
503
```

Log interno (solo visible en el servidor, nunca al cliente):
`[DATABASE_UNAVAILABLE] GET /requests: connect ECONNREFUSED 127.0.0.1:59999`.
