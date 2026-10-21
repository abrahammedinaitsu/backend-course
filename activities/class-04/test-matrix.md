# Test matrix — Entrega 04

> Fase 1: se declara lo **esperado**. Fase 6: cada caso se ejecuta y se registra lo
> **observado** (línea de estado literal y cuerpo). La columna observado se llena ejecutando,
> no copiando.

| Caso | Estado previo | Acción | Esperado | Observado |
| ---- | ------------- | ------ | -------- | --------- |
| Conectar correctamente | Proyecto activo | `npm run db:check` | Éxito | _(pendiente)_ |
| Crear solicitud | — | `POST /requests` | `201` | _(pendiente)_ |
| Reiniciar servidor | Solicitud creada | `GET /requests/:id` | Persiste | _(pendiente)_ |
| Buscar inexistente | — | `GET /requests/999` | `404` | _(pendiente)_ |
| Filtrar sin resultados | — | Filtro válido | `200 []` | _(pendiente)_ |
| Cambiar prioridad | `open` | `PATCH` | `200` | _(pendiente)_ |
| Transición válida | `open` | `in_progress` | `200` | _(pendiente)_ |
| Transición inválida | `open` | `closed` | `409` | _(pendiente)_ |
| Consultar historia | Transición hecha | `GET …/history` | `200` | _(pendiente)_ |
| Falla del historial | Estado previo | Cambio transaccional | Rollback | _(pendiente)_ |
| Base no disponible | — | Cualquier consulta | Error consistente | _(pendiente)_ |
| Reinicio de Express | Datos existentes | Consultar | Datos conservados | _(pendiente)_ |

> Agrego mis propios casos (mínimo dos):

| Caso | Estado previo | Acción | Esperado | Observado |
| ---- | ------------- | ------ | -------- | --------- |
| `status` enviado al crear | — | `POST` con `status:"closed"` | `201`, `status:"open"` (ignorado) | _(pendiente)_ |
| Body sin campos modificables | `open` | `PATCH` con `{"id":7}` | `400 NOTHING_TO_UPDATE` | _(pendiente)_ |
| Filtro combinado | — | `GET ?status=open&priority=low` | `200` + solo coincidencias | _(pendiente)_ |
| Modificar solicitud terminal | `closed` | `PATCH` con `{"title":"x"}` | `409 REQUEST_IN_TERMINAL_STATUS` | _(pendiente)_ |
| History de inexistente | — | `GET /requests/999/history` | `404` | _(pendiente)_ |

## Evidencia clave (texto, sin secretos)

### Persistencia tras reinicio

_(El 201 con su id → el reinicio → el 200 posterior. Nunca la URL de conexión.)_

```txt

```

### Rollback demostrado

_(Cómo provoqué el fallo controlado, la respuesta de error, y la consulta que muestra el
estado intacto. Documentar también cómo lo revertí.)_

```txt

```
