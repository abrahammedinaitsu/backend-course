# HTTP contract — Request API v3

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> Para cada endpoint: intención, path, query, body, respuesta exitosa, errores y un ejemplo.

## Formato de error (común a toda la API)

```json
{ "error": { "code": "TITLE_REQUIRED", "message": "Title is required" } }
```

Toda respuesta de error devuelve `Content-Type: application/json` y el mismo objeto:
`error.code` (string estable, para programas) y `error.message` (texto, para personas).

Códigos de error definidos:

| `code` | Se usa cuando |
| ------ | ------------- |
| `TITLE_REQUIRED` | Falta el título (o viene en blanco) al crear. `400` |
| `INVALID_PRIORITY` | `priority` con un valor desconocido. `400` |
| `UNKNOWN_FILTER` | Filtro con valor desconocido en la query. `400` |
| `REQUEST_NOT_FOUND` | No existe la solicitud con ese `id`. `404` |
| `INVALID_STATUS_TRANSITION` | El estado actual no permite el `status` pedido. `409` |
| `REQUEST_IN_TERMINAL_STATUS` | Se intenta modificar una solicitud `closed` o `cancelled`. `409` |
| `NOTHING_TO_UPDATE` | El body de PATCH no trae ningún campo modificable. `400` |

---

## `GET /requests`

* **Intención**: listar las solicitudes, opcionalmente filtradas.
* **Path**: `/requests`
* **Query**: `status` (uno de `open`, `in_progress`, `resolved`, `closed`, `cancelled`) y
  `priority` (uno de `low`, `medium`, `high`). Ambos opcionales y combinables.
* **Body**: ninguno.
* **Respuesta exitosa**: `200` + arreglo JSON de solicitudes. Sin coincidencias → `200` + `[]`
  (la pregunta "¿cuáles?" siempre tiene respuesta; vacío no es un error).
* **Errores**: `400` (`UNKNOWN_FILTER`) si `status` o `priority` traen un valor desconocido.

**Ejemplo**

```http
GET /requests?status=open&priority=high HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {
    "id": 1,
    "title": "Projector does not turn on",
    "description": "The projector in room 204 shows no image during class.",
    "status": "open",
    "priority": "high",
    "createdAt": "2026-10-21T00:20:00.000Z",
    "updatedAt": "2026-10-21T00:20:00.000Z"
  }
]
```

---

## `GET /requests/:id`

* **Intención**: consultar una solicitud concreta.
* **Path**: `/requests/:id`
* **Respuesta exitosa**: `200` + objeto de la solicitud.
* **Errores**: `404` (`REQUEST_NOT_FOUND`) si no existe.

**Ejemplo**

```http
GET /requests/1 HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{ "id": 1, "title": "Projector does not turn on", "description": "The projector in room 204 shows no image during class.", "status": "open", "priority": "high", "createdAt": "2026-10-21T00:20:00.000Z", "updatedAt": "2026-10-21T00:20:00.000Z" }
```

---

## `POST /requests`

* **Intención**: crear una solicitud nueva.
* **Body**: `{ "title", "description"?, "priority"? }`. Los campos `id`, `status`,
  `createdAt` y `updatedAt` que envíe el cliente se **ignoran**: los controla el servidor.
* **Respuesta exitosa**: `201` + objeto creado (con `id`, `status: "open"`, y fechas).
* **Errores**: `400` (`TITLE_REQUIRED`) si falta el título o viene en blanco;
  `400` (`INVALID_PRIORITY`) si `priority` trae un valor desconocido.

**Ejemplo**

```http
POST /requests HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{ "title": "Broken window", "description": "The window on the first floor does not close.", "priority": "high" }

HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{ "id": 4, "title": "Broken window", "description": "The window on the first floor does not close.", "status": "open", "priority": "high", "createdAt": "2026-10-21T00:20:05.000Z", "updatedAt": "2026-10-21T00:20:05.000Z" }
```

---

## `PATCH /requests/:id`

* **Intención**: modificar parcialmente una solicitud existente.
* **Body**: campos modificables `title`, `description`, `priority`, `status`. Los campos del
  servidor (`id`, `createdAt`, `updatedAt`) se ignoran si el cliente los envía. Debe traer al
  menos un campo modificable.
* **Respuesta exitosa**: `200` + objeto actualizado (con `updatedAt` renovado).
* **Errores**: la tabla completa:

| Situación | Estado | Código de error |
| --------- | -----: | --------------- |
| Body sin ningún campo modificable | `400` | `NOTHING_TO_UPDATE` |
| `status` con un valor desconocido | `400` | `INVALID_STATUS_TRANSITION` |
| `priority` con un valor desconocido | `400` | `INVALID_PRIORITY` |
| El `id` no existe | `404` | `REQUEST_NOT_FOUND` |
| Transición de estado no permitida | `409` | `INVALID_STATUS_TRANSITION` |
| La solicitud está en estado terminal | `409` | `REQUEST_IN_TERMINAL_STATUS` |

**Ejemplo (éxito y ejemplo de 409)**

```http
PATCH /requests/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{ "priority": "low" }

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{ "id": 1, "title": "Projector does not turn on", "status": "open", "priority": "low", "createdAt": "2026-10-21T00:20:00.000Z", "updatedAt": "2026-10-21T00:22:10.000Z" }

---

PATCH /requests/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{ "status": "closed" }        // estado previo: open

HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{ "error": { "code": "INVALID_STATUS_TRANSITION", "message": "Cannot change status from open to closed" } }
```
