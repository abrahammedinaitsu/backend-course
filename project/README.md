# Request API (proyecto transversal)

API modular de **solicitudes de mantenimiento**, construida con Express y persistida en
**PostgreSQL** (Supabase). Es el proyecto que evoluciona clase a clase. En la clase 4 el estado
dejó de vivir en el proceso y pasó a una base de datos compartida: se sumaron pool, consultas
parametrizadas, un **mapper**, un **service** que coordina, una **transacción** con rollback y
una **tabla de historia**.

## Requisitos

- Node.js 18 o superior.
- Un proyecto PostgreSQL (Supabase) accesible con una cadena de conexión.

## Configuración y ejecución

```bash
cd project
npm install
copy .env.example .env      # Windows (o `cp` en Linux/macOS)
# editar .env con TU DATABASE_URL (Session pooler, puerto 5432)
npm run db:check            # prueba de conexión: imprime la base y la versión, nunca la URL
# ejecutar database/migrations/001 y 002 en el SQL Editor de Supabase, en orden
npm start                   # Request API en http://localhost:3000
```

> **Nunca** subas `.env` al repositorio: contiene el secreto. `.env.example` documenta la forma
> con placeholders. Si tu `.env` tocó alguna vez un commit, restablece la contraseña del
> proyecto: borrar el archivo no borra el historial.

## Estructura y responsabilidades

```txt
project/
├── .env.example             Plantilla de configuración (sin valores reales).
├── .gitignore               Ignora .env y node_modules.
├── database/
│   ├── migrations/
│   │   ├── 001_create_requests.sql
│   │   └── 002_create_request_status_history.sql
│   └── seed.sql             Datos de ejemplo.
├── scripts/
│   └── check-database.js    npm run db:check.
├── docs/
│   ├── data-model.md
│   ├── http-contract.md
│   └── decisions/
│       ├── 001-cancel-instead-of-delete.md
│       └── 002-preserve-status-history.md
└── src/
    ├── app.js               Configura Express, middlewares, monta el módulo y el error handler.
    ├── server.js            Arranca el proceso y escucha en el puerto 3000.
    ├── database/
    │   ├── pool.js          El único pool del proceso.
    │   └── transaction.js   withTransaction: la unidad de trabajo.
    └── modules/
        └── requests/
            ├── requests.routes.js    HTTP entra, HTTP sale.
            ├── requests.service.js   Coordina: transiciones, unidad de trabajo.
            ├── requests.store.js     SQL parametrizado, filas van y vienen.
            ├── request.mapper.js     snake_case -> camelCase (la traducción única).
            └── request-status.js     La máquina de estados (intacta desde la clase 3).
```

| Archivo | Hace | No hace |
| ------- | ---- | ------- |
| `server.js` | Arranca el proceso y escucha | No sabe de rutas |
| `app.js` | Configura la app y clasifica errores | No abre puerto |
| `requests.routes.js` | Extrae path/query/body, invoca, traduce a códigos | No tiene SQL ni decide transiciones |
| `requests.service.js` | Valida transiciones, define la unidad de trabajo | No sabe qué es un status code |
| `requests.store.js` | SQL parametrizado; filas o `null` | No opina de HTTP |
| `request.mapper.js` | Traduce fila -> representación | No consulta |
| `request-status.js` | Estados, terminales, transiciones | No consulta ni responde |

## Endpoints

| Método | Ruta | Éxito | Errores |
| ------ | ---- | ----- | ------- |
| GET | `/requests` | `200` + arreglo (filtros `?status=` / `?priority=`) | `400 UNKNOWN_FILTER` |
| GET | `/requests/:id` | `200` + objeto | `404 REQUEST_NOT_FOUND` |
| GET | `/requests/:id/history` | `200` + eventos | `404 REQUEST_NOT_FOUND` |
| POST | `/requests` | `201` + objeto creado | `400 TITLE_REQUIRED`, `400 INVALID_PRIORITY` |
| PATCH | `/requests/:id` | `200` + objeto actualizado | `400 NOTHING_TO_UPDATE`, `400 INVALID_PRIORITY`, `404 REQUEST_NOT_FOUND`, `409 INVALID_STATUS_TRANSITION`, `409 REQUEST_IN_TERMINAL_STATUS` |

Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`. Categorías:
contrato `400`, recurso `404`, dominio `409`, persistencia `500`, infraestructura `503`.

## Integridad: quién protege qué

- **La base** protege la integridad estructural: `id` con `IDENTITY` (rechaza ids enviados),
  `title NOT NULL`, `CHECK` de `priority`/`status`, `FOREIGN KEY` de la historia, `DEFAULT` de
  prioridad/estado/fechas.
- **La aplicación** protege el proceso: las transiciones y los terminales (un `CHECK` ve el
  valor nuevo, no lo compara contra el anterior), el estado inicial, `updated_at` y la
  validación amable del contrato (400 con `code`).

## Ciclo de vida

`open → in_progress → resolved → closed` (camino feliz), salidas laterales
`open/in_progress → cancelled` y el retorno `resolved → in_progress`. `closed` y `cancelled`
son terminales. Cada cambio de estado **y el nacimiento** quedan registrados en
`request_status_history`.

## Exclusiones respetadas

Sin ORM (Prisma/Drizzle/Sequelize), sin `supabase-js`, sin Data API, sin acceso a la base desde
el frontend, sin Auth/Storage/Realtime/Edge Functions, sin claves `anon`/`service_role`, sin
Docker ni PostgreSQL local, sin `DELETE` (decisión 001 vigente), sin `SELECT *` en el store. Las
únicas dependencias son `express`, `pg` y `dotenv`.
