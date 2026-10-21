# Request API (proyecto transversal)

API modular de **solicitudes de mantenimiento**, construida con Express y persistida en
**PostgreSQL** (Supabase). Es el proyecto que evoluciona clase a clase.

* **Clase 03**: la API en memoria (contrato HTTP, estados, transiciones).
* **Clase 04**: el estado dejó de vivir en el proceso — pool, consultas parametrizadas, mapper,
  service que coordina, transacción con rollback y tabla de historia.
* **Clase 05**: la API **aprendió quién** hace cada petición — autenticación (JWT), **propiedad**
  (`createdBy`), **permisos** por rol (`request.policy.js`) y **auditoría** (`changedBy` en el
  historial). Todo protegido con `Bearer` y defendido por un validador que intenta romperlo.

## Requisitos

- Node.js 18 o superior.
- Un proyecto PostgreSQL (Supabase) accesible con una cadena de conexión.

## Configuración y ejecución

```bash
cd project
npm install
copy .env.example .env      # Windows (o `cp` en Linux/macOS)
```

Edita `.env` con:

- `DATABASE_URL`: tu cadena (Session pooler de Supabase, puerto 5432).
- `JWT_SECRET`: un secreto **tuyo** y aleatorio. Genéralo con:
  ```bash
  node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
  ```
- `FRONTEND_ORIGIN`: el origen EXACTO del frontend (entrega 05A).

```bash
npm run db:check            # prueba de conexión (imprime la base y la versión, nunca la URL)
# Ejecutar las migraciones en el SQL Editor de Supabase, EN ORDEN:
#   database/migrations/001, 002, 003, 004, 005
# Luego, opcionalmente, database/seed.sql (datos de ejemplo).
npm start                   # Request API en http://localhost:3000
```

> Si cambias `JWT_SECRET` en `.env`, **reinicia** el servidor: los tokens se firman con el valor
> cargado al arrancar.

> **Nunca** subas `.env` al repositorio: contiene los secretos. `.env.example` documenta la forma
> con placeholders. Si tu `.env` tocó alguna vez un commit, restablece la contraseña del proyecto:
> borrar el archivo no borra el historial.

## Validación del taller (clase 05)

El **validador** es la especificación ejecutable del taller: ataca el backend por HTTP y solo
toca PostgreSQL para verificar, promover un usuario sintético y limpiar.

```bash
npm run validate:class-05 -- --stage setup
npm run validate:class-05 -- --stage access-design
npm run validate:class-05 -- --stage register
# ... password, login, authentication, ownership, authorization
npm run validate:class-05        # boss battle integral (12 checks) -> 12/12
```

## Estructura y responsabilidades

```txt
project/
├── .env.example             Plantilla de configuración (sin valores reales).
├── .gitignore               Ignora .env y node_modules.
├── activities/class-05/     El diseño de acceso (matriz, contrato de auth, amenazas) y la evidencia.
├── database/
│   ├── migrations/
│   │   ├── 001_create_requests.sql            (clase 04)
│   │   ├── 002_create_request_status_history.sql
│   │   ├── 003_create_users.sql               (clase 05)
│   │   ├── 004_add_request_ownership.sql      (created_by)
│   │   └── 005_add_history_actor.sql          (changed_by)
│   └── seed.sql             Datos de ejemplo.
├── scripts/
│   ├── check-database.js    npm run db:check.
│   └── validate-class-05.js El validador (especificación ejecutable).
├── docs/
│   ├── data-model.md
│   ├── http-contract.md
│   └── decisions/…
└── src/
    ├── app.js               CORS, monta módulos, protege /requests, error handler central.
    ├── app-error.js         Error tipado por categoría (contract/auth/forbidden/resource/domain).
    ├── server.js            Arranca el proceso y escucha en el puerto 3000.
    ├── http/
    │   └── respond-error.js Traducción ÚNICA de errores a respuestas HTTP.
    ├── middleware/
    │   ├── authenticate.js  Del header Bearer a req.auth (la única identidad confiable).
    │   └── cors.js          Origen explícito desde FRONTEND_ORIGIN.
    ├── database/
    │   ├── pool.js          El único pool del proceso.
    │   └── transaction.js   withTransaction: la unidad de trabajo.
    └── modules/
        ├── auth/
        │   ├── auth.routes.js   HTTP de /auth.
        │   ├── auth.service.js  register / login / getCurrentUser.
        │   ├── password.js      Helper scrypt (contrato fijo del curso).
        │   └── token.js         Emisión y verificación del JWT (jose).
        ├── users/
        │   ├── users.store.js   SQL de usuarios.
        │   └── user.mapper.js   Lo que sale del usuario (el hash NUNCA cruza).
        └── requests/
            ├── requests.routes.js   HTTP entra, HTTP sale.
            ├── requests.service.js  Coordina: actor, política, transiciones, unidad de trabajo.
            ├── requests.store.js    SQL parametrizado (la propiedad se acota AQUÍ).
            ├── request.mapper.js    snake_case -> camelCase (la traducción única).
            ├── request.policy.js    Autorización PURA (actor, representación) -> boolean.
            └── request-status.js    La máquina de estados (intacta desde la clase 3).
```

| Archivo | Hace | No hace |
| ------- | ---- | ------- |
| `server.js` | Arranca el proceso y escucha | No sabe de rutas |
| `app.js` | CORS, monta módulos, protege `/requests`, clasifica errores | No abre puerto |
| `authenticate.js` | Establece QUIÉN es el actor (`req.auth`) | No decide permisos |
| `request.policy.js` | Decide QUÉ está permitido (puro) | No tiene SQL ni HTTP |
| `respond-error.js` | Traduce errores a HTTP | No conoce el dominio |
| `requests.routes.js` | Extrae path/query/body, pasa `req.auth`, traduce a códigos | No tiene SQL |
| `requests.service.js` | Autoriza contra la fila actual, define la unidad de trabajo | No sabe qué es un status code |
| `requests.store.js` | SQL parametrizado; filas o `null` | No opina de HTTP |
| `user.mapper.js` | Traduce usuario -> representación | Nunca expone el hash |

## Endpoints

### `/auth`

| Método | Ruta | Acceso | Éxito | Errores |
| ------ | ---- | ------ | ----- | ------- |
| POST | `/auth/register` | Público | `201` + usuario | `400 SERVER_CONTROLLED_FIELD/INVALID_EMAIL/INVALID_PASSWORD`, `409 ACCOUNT_CANNOT_BE_CREATED` |
| POST | `/auth/login` | Público | `200` + `accessToken`, `tokenType`, `expiresIn` | `401 INVALID_CREDENTIALS` (único, genérico) |
| GET | `/auth/me` | Bearer | `200` + `{ id, email, role }` | `401 AUTHENTICATION_REQUIRED/INVALID_TOKEN` |

### `/requests` (todas exigen Bearer)

| Método | Ruta | Quién | Éxito | Errores |
| ------ | ---- | ----- | ----- | ------- |
| GET | `/requests` | requester (lo suyo) / agent (todo) | `200` + arreglo | `401`, `400 INVALID_FILTER` |
| GET | `/requests/:id` | agent cualquiera / requester solo la suya | `200` + objeto | `401`, `404 REQUEST_NOT_FOUND` |
| GET | `/requests/:id/history` | igual que la solicitud | `200` + eventos | `401`, `404 REQUEST_NOT_FOUND` |
| POST | `/requests` | **solo requester** | `201` + objeto (`createdBy` del token) | `401`, `403 FORBIDDEN`, `400 TITLE_REQUIRED/INVALID_PRIORITY/SERVER_CONTROLLED_FIELD` |
| PATCH | `/requests/:id` | contenido: dueño∧abierto · prioridad/estado: agent | `200` + objeto | `401`, `403 FORBIDDEN`, `404`, `400`, `409 INVALID_STATUS_TRANSITION/REQUEST_IN_TERMINAL_STATUS` |

Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

## Matriz de acceso (quién puede qué)

| Operación | Anónimo | Requester | Agent |
| --------- | ------- | --------- | ----- |
| Registro / login | Sí | — | — |
| `GET /auth/me` | No | Propia | Propia |
| `GET /requests` | No | Propias | Todas |
| `GET /requests/:id` · `/history` | No | Propia | Todas |
| `POST /requests` | No | Sí | **No** |
| Editar título/descripción | No | Propia y abierta | No |
| Cambiar prioridad / estado | No | No | Todas |

Semántica: **401** «no sé quién eres» · **403** «sé quién eres; esto no» · **404** «para ti, no
existe» (el recurso ajeno responde como inexistente) · **409** «existe, pero choca».

## Identidad, autenticación, autorización y auditoría

- **Identidad**: la fila en `users` (`id`, `email`, `role`).
- **Autenticación**: login + token **verificado** → `req.auth`.
- **Autorización**: `request.policy.js` (rol + propiedad + estado), aplicada todo-o-nada.
- **Auditoría**: `changed_by` en `request_status_history` (quién produjo cada transición).

## Integridad: quién protege qué

- **La base** protege la integridad estructural: `id` con `IDENTITY`/`UUID` (rechaza ids
  enviados), `title NOT NULL`, `CHECK` de `priority`/`role`/`status`, claves foráneas de historia
  y propiedad, `DEFAULT` de rol/prioridad/estado/fechas, `UNIQUE(email)`.
- **La aplicación** protege el proceso: las transiciones y los terminales (un `CHECK` ve el valor
  nuevo, no lo compara contra el anterior), el estado inicial, `updated_at`, la **política** de
  acceso y la validación amable del contrato (400/403 con `code`).

## Ciclo de vida

`open → in_progress → resolved → closed` (camino feliz), salidas laterales
`open/in_progress → cancelled` y el retorno `resolved → in_progress`. `closed` y `cancelled`
son terminales **para todos los roles**. Cada cambio de estado **y el nacimiento** quedan
registrados en `request_status_history` con su actor (`changed_by`).

## Exclusiones respetadas

Sin ORM (Prisma/Drizzle/Sequelize), sin `supabase-js`, sin Data API, sin acceso a la base desde
el frontend, sin Auth/Storage/Realtime/Edge Functions de Supabase, sin claves `anon`/`service_role`,
sin Docker ni PostgreSQL local, sin `DELETE` (decisión 001 de la clase 04 vigente), sin `SELECT *`
en los stores, sin `decodeJwt` para confiar. Dependencias: `express`, `pg`, `dotenv`, `jose`.
