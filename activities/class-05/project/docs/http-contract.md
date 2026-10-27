# HTTP contract — Request API v5

> La clase 05 no inventa endpoints nuevos: **agrega identidad**. Los mismos recursos de las
> clases 3 y 4 ahora exigen un actor confiable y obedecen una política. Se **suma** el módulo
> `/auth` (tres endpoints) y se **enriquecen** las representaciones con `createdBy`/`changedBy`.
> La conversación por fuera casi no cambia; por dentro, cada petición ahora sabe **quién** la
> hace y **qué** tiene permitido.

## Autenticación

Todas las rutas de `/requests` y `GET /auth/me` exigen:

```http
Authorization: Bearer <jwt>
```

El token se obtiene en `POST /auth/login`. Va **firmado, no cifrado**: su payload es legible,
por eso no lleva nada sensible. El backend **verifica** (firma, algoritmo, emisor, audiencia,
expiración); nunca confía en un payload solo decodificado.

## Formato de error (común a toda la API)

```json
{ "error": { "code": "TITLE_REQUIRED", "message": "Title is required" } }
```

Toda respuesta de error devuelve `Content-Type: application/json` y el mismo objeto:
`error.code` (string estable, para programas) y `error.message` (texto, para personas).

### Códigos de error v5

| `code` | HTTP | Se usa cuando |
| ------ | ---- | ------------- |
| `AUTHENTICATION_REQUIRED` | 401 | Falta el header `Authorization`, o el esquema no es `Bearer` (o el token viene vacío). |
| `INVALID_TOKEN` | 401 | El token no verifica: firma alterada, expirado, emisor/audiencia equivocados. Una misma respuesta sin decir cuál control falló. |
| `INVALID_CREDENTIALS` | 401 | Login fallido (email inexistente, password mala, cualquier causa). Idéntica en todos los casos. |
| `SERVER_CONTROLLED_FIELD` | 400 | El body trae un campo que el servidor decide (`role`, `id`, `createdBy`, `changedBy`, `createdAt`, `updatedAt`, `passwordHash`; y `status` al crear). Rechazo explícito. |
| `INVALID_EMAIL` | 400 | Registro con email ausente o mal formado. |
| `INVALID_PASSWORD` | 400 | Registro con password fuera de 15–128 caracteres. |
| `ACCOUNT_CANNOT_BE_CREATED` | 409 | Registro con un email ya existente. Genérico: no confirma que la cuenta exista. |
| `FORBIDDEN` | 403 | Actor identificado cuya operación la política prohíbe. |
| `TITLE_REQUIRED` | 400 | Falta el título (o viene en blanco). |
| `INVALID_PRIORITY` | 400 | `priority` con un valor desconocido. |
| `INVALID_STATUS` | 400 | `status` con un valor desconocido. |
| `INVALID_FILTER` | 400 | Filtro de query con valor desconocido. |
| `NOTHING_TO_UPDATE` | 400 | El body de PATCH no trae ningún campo modificable. |
| `REQUEST_NOT_FOUND` | 404 | No existe la solicitud — **o es de otro y no debes saber que existe** (misma respuesta). |
| `INVALID_STATUS_TRANSITION` | 409 | El estado actual no permite el `status` pedido (para todos los roles). |
| `REQUEST_IN_TERMINAL_STATUS` | 409 | Se intenta modificar una solicitud `closed` o `cancelled`. |
| `PERSISTENCE_CONSTRAINT` | 500 | La base rechazó algo que la app creía válido (violación de CHECK/FK/unique). |
| `DATABASE_UNAVAILABLE` | 503 | La base no está disponible (pausada, sin red). |
| `INTERNAL_ERROR` | 500 | Error inesperado no identificado. |
| `NOT_FOUND` | 404 | La ruta no existe. |

### Semántica (el criterio)

* **401** — «No sé quién eres» (falta identidad o no verifica).
* **403** — «Sé quién eres; esto no» (identificado, operación prohibida por la política).
* **404** — «Para ti, no existe» (no existe, o es ajeno y no se revela su existencia).
* **409** — «Existe, pero choca» (petición bien formada que choca con el estado actual).

---

# Módulo `/auth`

## `POST /auth/register`

* **Intención**: crear una cuenta.
* **Acceso**: público.
* **Body permitido**: `{ "email", "password" }` — nada más.
* **Rechazos explícitos** (`400 SERVER_CONTROLLED_FIELD`): `role`, `id`, `createdAt`,
  `updatedAt`, `createdBy`, `passwordHash`.
* **Email**: requerido, formato básico, se normaliza (trim + minúsculas) antes de guardar.
* **Password**: 15–128 caracteres (Unicode y espacios permitidos). **Nunca** se registra ni se
  devuelve.
* **Respuesta exitosa**: `201` + `{ id, email, role, createdAt }`. El `role` es siempre
  `requester` (lo impone la base).
* **Errores**: `400 SERVER_CONTROLLED_FIELD`, `400 INVALID_EMAIL`, `400 INVALID_PASSWORD`,
  `409 ACCOUNT_CANNOT_BE_CREATED`.

```http
POST /auth/register HTTP/1.1
Content-Type: application/json

{ "email": "ana@example.com", "password": "correct horse battery staple" }

HTTP/1.1 201 Created

{ "id": "0b6f2c1e-8a44-4d5f-9c1a-7e2b3d4f5a60", "email": "ana@example.com", "role": "requester", "createdAt": "2026-10-21T12:00:00.000Z" }
```

## `POST /auth/login`

* **Intención**: demostrar la identidad y obtener el token.
* **Acceso**: público.
* **Body permitido**: `{ "email", "password" }`.
* **Respuesta exitosa**: `200` + `{ accessToken, tokenType: "Bearer", expiresIn }` (segundos).
* **Errores**: toda falla responde **la misma** `401 INVALID_CREDENTIALS` con idéntico mensaje
  (email inexistente, password mala o cualquier otra causa → bytes iguales).

```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{ "email": "ana@example.com", "password": "correct horse battery staple" }

HTTP/1.1 200 OK

{ "accessToken": "<jwt de tres segmentos>", "tokenType": "Bearer", "expiresIn": 3600 }
```

## `GET /auth/me`

* **Intención**: responder «¿quién cree el servidor que soy?».
* **Acceso**: **protegido (Bearer)**.
* **Respuesta exitosa**: `200` + `{ id, email, role }`. **Jamás** material de password.
* **Errores**: `401 AUTHENTICATION_REQUIRED` (sin header o sin esquema Bearer);
  `401 INVALID_TOKEN` (no verifica).

```http
GET /auth/me HTTP/1.1
Authorization: Bearer <jwt>

HTTP/1.1 200 OK

{ "id": "0b6f2c1e-8a44-4d5f-9c1a-7e2b3d4f5a60", "email": "ana@example.com", "role": "requester" }
```

---

# Módulo `/requests` (todo protegido con Bearer)

> Representación de una solicitud: `{ id, title, description, priority, status, createdAt,
> updatedAt, createdBy }`. `createdBy` es el dueño (UUID) o `null` para las heredadas.

## `GET /requests`

* **Intención**: listar solicitudes, con filtros opcionales.
* **Query**: `status` y `priority` (opcionales, combinables).
* **Alcance por rol**: un **requester** ve **solo lo suyo** (acotado en SQL); un **agent** ve
  **todas**, incluidas las heredadas (`createdBy: null`).
* **Respuesta exitosa**: `200` + arreglo. Sin coincidencias → `200 []`.
* **Errores**: `401`; `400 INVALID_FILTER`.

## `GET /requests/:id`

* **Alcance por rol**: agent cualquiera; requester solo las suyas.
* **Respuesta exitosa**: `200` + objeto.
* **Errores**: `401`; `404 REQUEST_NOT_FOUND` si no existe **o es ajeno** (idéntico).

## `GET /requests/:id/history`

* **Alcance**: igual que la solicitud (el historial es tan privado como ella).
* **Respuesta exitosa**: `200` + `[ { previousStatus, newStatus, changedAt, changedBy } ]`,
  del más antiguo al más reciente. El nacimiento es `previousStatus: null` (`NULL → open`).
* **Errores**: `401`; `404 REQUEST_NOT_FOUND` si no existe **o es ajena**.

## `POST /requests`

* **Quién**: **solo un requester** (un agent recibe `403 FORBIDDEN`).
* **Body permitido**: `{ title, description?, priority? }`.
* **Rechazos explícitos** (`400 SERVER_CONTROLLED_FIELD`): `id`, `createdBy`, `createdAt`,
  `updatedAt`, `changedBy` y **`status`** (una solicitud nace `open`).
* **Respuesta exitosa**: `201` + objeto creado, con `createdBy` tomado del token.
* **Errores**: `401`; `403 FORBIDDEN`; `400 TITLE_REQUIRED`; `400 INVALID_PRIORITY`;
  `400 SERVER_CONTROLLED_FIELD`.

## `PATCH /requests/:id`

* **Campos modificables**: `title`, `description` (contenido), `priority`, `status`.
* **Rechazos explícitos** (`400 SERVER_CONTROLLED_FIELD`): `id`, `createdBy`, `createdAt`,
  `updatedAt`, `changedBy`.
* **Autorización (todo-o-nada, con la fila actual delante)**:
  * **contenido** (`title`/`description`): requester **dueño** y con la solicitud **abierta**;
  * **prioridad**: solo agent;
  * **estado**: solo agent (y la máquina de estados sigue aplicando).
  Un body que mezcla un campo permitido con uno prohibido se rechaza **entero** (`403`); no hay
  actualizaciones parciales sorpresa.
* **Respuesta exitosa**: `200` + objeto actualizado.
* **Errores**: `401`; `403 FORBIDDEN`; `404 REQUEST_NOT_FOUND`; `400 NOTHING_TO_UPDATE`;
  `400 TITLE_REQUIRED`; `400 INVALID_PRIORITY`; `400 INVALID_STATUS`;
  `409 INVALID_STATUS_TRANSITION`; `409 REQUEST_IN_TERMINAL_STATUS`.

```http
PATCH /requests/1 HTTP/1.1
Authorization: Bearer <jwt del agent>
Content-Type: application/json

{ "status": "in_progress" }

HTTP/1.1 200 OK

{ "id": 1, "title": "Projector does not turn on", "status": "in_progress", "priority": "high", "createdAt": "2026-10-21T00:20:00.000Z", "updatedAt": "2026-10-21T00:34:51.000Z", "createdBy": "0b6f2c1e-8a44-4d5f-9c1a-7e2b3d4f5a60" }
```

---

## Reglas que NO cambiaron (clases 3 y 4)

* El **formato de error** es el mismo objeto.
* Los **estados** y las **transiciones** siguen siendo los de la clase 03
  (`open → in_progress → resolved → closed`, con `cancelled` y los terminales `closed`/`cancelled`).
* El **historial** se conserva y ahora registra **quién** produjo cada transición (`changedBy`).
* La **creación es una transacción**: la solicitud y su nacimiento (`NULL → open`) juntos.
