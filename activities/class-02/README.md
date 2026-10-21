# Actividad Clase 02 — HTTP: el contrato entre cliente y servidor

## Qué contiene esta carpeta y cómo está organizada

```txt
activities/class-02/
├── README.md                Este archivo.
├── lite-analysis.md         Análisis independiente de la API Lite (hecho ANTES de usar IA y ANTES de corregir). Tag: class-02-lite-analysis.
├── casos-de-prueba.md       Resultados observados de los casos manuales (A, B y C).
├── comparison.md            Comparación Lite vs Full + las 14 preguntas + reflexión final.
├── ai-usage.md              Registro del uso de IA (fase Full únicamente).
├── lite-api/                Request API Lite: la versión de partida, corregida en commits posteriores.
│   ├── package.json
│   └── server.js
└── project/                 Request API Full (incremento 1).
    ├── README.md
    ├── package.json
    ├── spec.txt             Especificación escrita antes del primer prompt.
    ├── docs/
    │   └── http-contract.md Contrato HTTP, escrito antes de los manejadores.
    └── src/
        ├── app.js
        ├── server.js
        ├── routes/
        │   └── requests.routes.js
        └── data/
            └── requests.js
```

Dos APIs del mismo recurso (*solicitudes de mantenimiento*), aprendidas por caminos opuestos:
**Lite** reconstruye el contrato desde código ajeno; **Full** lo declara antes de que exista
código. Ambas escuchan en `http://localhost:3000`, así que se prueban una a la vez.

## Cómo instalar y ejecutar cada proyecto

### Request API Lite

```bash
cd activities/class-02/lite-api
npm install
node server.js
# Request API Lite is running on http://localhost:3000
```

### Request API Full

```bash
cd activities/class-02/project
npm install
node src/server.js
# Request API Full is running on http://localhost:3000
```

Detén cada servidor con `Ctrl + C` antes de levantar el otro. `node_modules/` está ignorado por
`.gitignore` en la raíz del repositorio.

## Resumen de los defectos encontrados en el Lite y su corrección

Los cuatro defectos se observaron ejecutando la versión de partida, con su evidencia en
`lite-analysis.md`, y son los mismos cuatro que el starter traía intencionalmente:

| # | Defecto encontrado | Evidencia observada | Corrección aplicada |
| - | ------------------ | ------------------- | ------------------- |
| 1 | La ruta de listado usa un verbo: `GET /getRequests` | `GET /requests` daba `404 Cannot GET /requests` | Renombrar la ruta a `GET /requests` (sustantivo del recurso). El método ya expresa la operación. |
| 2 | `GET /requests/:id` devuelve `200` aunque no exista | `GET /requests/999` → `200` + `{"error":"Request not found"}` | Devolver `404` cuando la solicitud no existe. El estado deja de contradecir al cuerpo. |
| 3 | La creación devuelve `200` en lugar de `201` | `POST /requests` → `200` + objeto creado | Devolver `201 Created`, para que el cliente distinga una creación de una lectura. |
| 4 | Acepta una creación sin título | `POST /requests` sin `title` → `200` y luego la lista incluía una solicitud incompleta (`id: 5`) | Validar antes de mutar: `400` + `{"error":"Title is required"}` y **sin** cambios en los datos. |

La evidencia del estado original queda en el historial de Git (commit del análisis + tag
`class-02-lite-analysis`), y las correcciones van en commits posteriores. El código original no
se borra: sigue siendo visible en el historial.

## Qué decisiones tomé en el Full y por qué

- **Escribí `spec.txt` y `docs/http-contract.md` antes del primer prompt.** Sin un objetivo
  cerrado, cualquier cosa que devuelva la IA parece razonable y no hay contra qué compararla.
- **`400`, no `404`, cuando falta el título:** el recurso `/requests` sí existe; lo que está mal
  es la petición del cliente (incompleta). `404` diría otra cosa.
- **`201` al crear:** se produjo un recurso nuevo y el protocolo tiene un código para comunicarlo.
- **La validación ocurre antes de tocar los datos:** una petición inválida no deja rastro.
- **La estructura se justifica por responsabilidades:** `data/requests.js` es lo único que cambiaría
  si los datos dejaran de estar en memoria; `server.js` y `app.js` están separados para poder
  montar la aplicación sin abrir un puerto.
- **Respeté todas las exclusiones:** sin base de datos, sin TypeScript, sin autenticación, sin
  capas extra, sin `PUT`/`PATCH`/`DELETE`, sin dependencias además de Express y sin frontend.

## Cómo verificar

- Resultados observados de todos los casos (A, B y C): `casos-de-prueba.md`.
- Análisis y evidencia del Lite: `lite-analysis.md`.
- Contrato del Full: `project/docs/http-contract.md`.
- Uso de IA: `ai-usage.md`.
- Comparación y reflexión: `comparison.md`.

## Entrega

- Carpeta: `activities/class-02/`
- Tag intermedio (análisis sin IA): `class-02-lite-analysis`
- Tag final: `class-02-submission`

## Reflexión

Lo que más me llevo de esta clase es la distinción entre **diseñar** un contrato, **implementarlo**
con una abstracción y **evaluar** si esa abstracción era la adecuada. El Lite me obligó a leer
código ajeno y encontrar problemas que nadie me señaló, sobre todo la contradicción entre estado y
cuerpo, que un cliente automático no puede detectar. El Full me mostró que escribir la
especificación antes es lo que convierte a la IA en una herramienta y no en una fuente de código
que no puedo defender. Programar fue la parte rápida; decidir y verificar fue la parte que enseñó.
