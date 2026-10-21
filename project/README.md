# Request API (proyecto transversal)

API modular de **solicitudes de mantenimiento**, construida con Express y datos en memoria.
Es el proyecto que evoluciona clase a clase. En la clase 3 pasó de tres endpoints sueltos a un
**módulo de solicitudes** con máquina de estados, filtros y un contrato de errores uniforme.

## Requisitos

- Node.js 18 o superior.

## Instalación y ejecución

```bash
cd project
npm install
node src/server.js
# Request API is running on http://localhost:3000
```

## Estructura y responsabilidades

```txt
project/
├── README.md
├── package.json
├── docs/
│   ├── http-contract.md          El contrato HTTP v3 (se lee primero).
│   └── decisions/
│       └── 001-cancel-instead-of-delete.md   Decisión técnica 001.
└── src/
    ├── app.js                    Configura Express, middlewares y monta el módulo.
    ├── server.js                 Arranca el proceso y escucha en el puerto 3000.
    └── modules/
        └── requests/
            ├── requests.routes.js    Los cuatro endpoints del recurso.
            ├── requests.store.js     Datos en memoria + generación de id.
            └── request-status.js     La máquina de estados (única fuente de verdad).
```

| Archivo | Responsabilidad |
| ------- | --------------- |
| `src/server.js` | Arranca el proceso y escucha. No sabe de rutas. |
| `src/app.js` | Configura la app y monta el módulo. No abre puerto. |
| `modules/requests/requests.routes.js` | Los cuatro endpoints del recurso. |
| `modules/requests/requests.store.js` | Origen de datos y `generateId()`. Único archivo a tocar si aparece una base de datos. |
| `modules/requests/request-status.js` | Estados, terminales y transiciones permitidas. |

## Endpoints

| Método | Ruta | Éxito | Errores |
| ------ | ---- | ----- | ------- |
| GET | `/requests` | `200` + arreglo (filtros `?status=` / `?priority=`) | `400 UNKNOWN_FILTER` |
| GET | `/requests/:id` | `200` + objeto | `404 REQUEST_NOT_FOUND` |
| POST | `/requests` | `201` + objeto creado | `400 TITLE_REQUIRED`, `400 INVALID_PRIORITY` |
| PATCH | `/requests/:id` | `200` + objeto actualizado | `400 NOTHING_TO_UPDATE`, `400 INVALID_PRIORITY`, `404 REQUEST_NOT_FOUND`, `409 INVALID_STATUS_TRANSITION`, `409 REQUEST_IN_TERMINAL_STATUS` |

Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

## Ciclo de vida

`open → in_progress → resolved → closed` (camino feliz), con salidas laterales
`open/in_progress → cancelled` y el retorno `resolved → in_progress`. `closed` y `cancelled`
son terminales. La regla vive en un solo archivo: `request-status.js`.

## Exclusiones respetadas

Sin base de datos ni persistencia en archivo, sin `DELETE`, sin librerías de validación, sin
autenticación, sin capas `controllers/services/repositories`, sin dependencias además de
Express y sin frontend. La pérdida de datos al reiniciar es comportamiento esperado y
documentado.
