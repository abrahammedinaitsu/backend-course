# Error map — Entrega 04

> Fase 1 · clasifico cada situación por categoría y defino la respuesta externa.
> Regla transversal: la respuesta al cliente **jamás** incluye contraseñas, hosts, sentencias
> SQL, stack traces ni errores crudos de PostgreSQL.

## Categorías

| Categoría | Significado | Estado HTTP |
| --------- | ----------- | ----------- |
| Contrato | La petición está mal en sí misma | `400` |
| Recurso | El recurso referido no existe | `404` |
| Dominio | Petición válida que el estado actual prohíbe | `409` |
| Persistencia | La base rechazó algo que la app creía válido | `500` |
| Infraestructura | La base no está disponible | `503` |
| Interno | Error inesperado no identificado | `500` |

## Situaciones concretas

| Situación | Categoría | Estado | Código de error |
| --------- | --------- | ------ | --------------- |
| Falta `title` al crear | Contrato | `400` | `TITLE_REQUIRED` |
| Prioridad desconocida | Contrato | `400` | `INVALID_PRIORITY` |
| Filtro con valor desconocido | Contrato | `400` | `UNKNOWN_FILTER` |
| Body de PATCH sin campos modificables | Contrato | `400` | `NOTHING_TO_UPDATE` |
| Solicitud inexistente | Recurso | `404` | `REQUEST_NOT_FOUND` |
| Transición inválida | Dominio | `409` | `INVALID_STATUS_TRANSITION` |
| Solicitud terminal | Dominio | `409` | `REQUEST_IN_TERMINAL_STATUS` |
| Restricción CHECK rechaza un INSERT | Persistencia | `500` | `PERSISTENCE_CONSTRAINT` |
| Base pausada / sin red | Infraestructura | `503` | `DATABASE_UNAVAILABLE` |
| Error de pg no identificado | Interno | `500` | `INTERNAL_ERROR` |
| Ruta no existente | Recurso | `404` | `NOT_FOUND` |

## Qué se registra en el log interno

**Se registra** (lo suficiente para diagnosticar): el `code` del error de PostgreSQL
(`error.code` de pg, por ejemplo `23514` para violación de `CHECK`, `23503` para FK), el
nombre de la tabla/constraint cuando pg lo da, el mensaje interno, la ruta y el método HTTP,
y el `stack` en errores no esperados.

**Queda prohibido loggear** (y por supuesto responder al cliente): la `DATABASE_URL`, la
contraseña, el host interno, la sentencia SQL con datos embebidos, el `error.detail` de pg
(cuando incluye valores de fila) y el stack trace en la respuesta HTTP.

> Formato de respuesta al cliente — el mismo `code`/`message` desde la clase 3, ahora con las
> dos categorías nuevas:
>
> ```json
> { "error": { "code": "DATABASE_UNAVAILABLE", "message": "The service cannot access its data store." } }
> ```
>
> El contrato de errores **sobrevive a la infraestructura**: aunque falle la base, el cliente
> recibe el mismo formato de siempre y un `503` que dice "no es tu culpa, reintenta luego".

### Mapeo pg → respuesta

| Error de pg | Significado | Categoría | Respuesta |
| ----------- | ----------- | --------- | --------- |
| `23514` | `check_violation` | Persistencia | `500 PERSISTENCE_CONSTRAINT` |
| `23503` | `foreign_key_violation` | Persistencia | `500 PERSISTENCE_CONSTRAINT` |
| `23505` | `unique_violation` | Persistencia | `500 PERSISTENCE_CONSTRAINT` |
| `ECONNREFUSED` / `ETIMEDOUT` / `ENOTFOUND` / `57P01` / `57P03` | no se puede alcanzar / base apagada | Infraestructura | `503 DATABASE_UNAVAILABLE` |
| cualquier otro `error` | inesperado | Interno | `500 INTERNAL_ERROR` |
