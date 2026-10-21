# Request API Full

API modular de **solicitudes de mantenimiento** construida con Express. Es el proyecto Full de
la clase 02: el mismo recurso del proyecto Lite, pero con responsabilidades repartidas en
archivos y un contrato HTTP declarado antes de escribir los manejadores.

## Requisitos

- Node.js 18 o superior (`node --version`).

## Instalación y ejecución

```bash
cd activities/class-02/project
npm install
node src/server.js
# Request API Full is running on http://localhost:3000
```

## Estructura y responsabilidades

```txt
project/
├── README.md
├── package.json
├── spec.txt                 Especificación escrita antes del primer prompt.
├── docs/
│   └── http-contract.md     El contrato HTTP (se lee primero).
└── src/
    ├── app.js               Crea la app de Express, activa express.json() y monta el router.
    ├── server.js            Arranca el proceso y escucha en el puerto 3000.
    ├── routes/
    │   └── requests.routes.js  Declara los tres endpoints del recurso.
    └── data/
        └── requests.js      Guarda los datos en memoria y genera los identificadores.
```

| Archivo                          | De qué se encarga                                                    |
| -------------------------------- | -------------------------------------------------------------------- |
| `src/server.js`                  | Arranca el proceso y escucha. No sabe nada de rutas.                 |
| `src/app.js`                     | Configura la aplicación y monta el router. No abre ningún puerto.    |
| `src/data/requests.js`           | Origen de los datos y `generateId()`. Único archivo a tocar si mañana hay base de datos. |
| `src/routes/requests.routes.js`  | Los tres endpoints del recurso `/requests`.                          |
| `docs/http-contract.md`          | El contrato que la implementación debe cumplir.                      |

La separación permite montar `app.js` sin abrir un puerto (pruebas) y cambiar el puerto en
`server.js` sin tocar las rutas.

## Endpoints

| Método | Ruta             | Éxito            | Errores |
| ------ | ---------------- | ---------------- | ------- |
| GET    | `/requests`      | `200` + arreglo  | — |
| GET    | `/requests/:id`  | `200` + objeto   | `404` `{"error":"Request not found"}` |
| POST   | `/requests`      | `201` + objeto   | `400` `{"error":"Title is required"}` |

## Exclusiones respetadas

Sin base de datos, sin TypeScript, sin autenticación, sin capas de controladores/servicios/
repositorios, sin `PUT`/`PATCH`/`DELETE`, sin dependencias además de Express y sin frontend.
