# AI usage

> Los títulos de sección están en inglés a propósito: son los mismos en todas las entregas.
> El contenido está en español.

**Restricciones que acompañaron toda la conversación (las del proyecto Full):** sin base de
datos, sin TypeScript, sin autenticación, sin capas extra de controladores/servicios/
repositorios, sin `PUT`/`PATCH`/`DELETE`, sin dependencias además de Express, sin frontend.

## What I asked for

Usé IA **solo en la fase Full**, después de haber marcado el análisis del Lite con el tag
`class-02-lite-analysis`. Primero escribí `activities/class-02/project/spec.txt` (recurso, endpoints, estados
esperados, representación, almacenamiento, estructura y exclusiones) y `docs/http-contract.md`.
Recién después pedí la implementación.

Resumen fiel del prompt:

> "Tengo esta especificación (spec.txt adjunta) y este contrato HTTP (http-contract.md). Escribe
> los manejadores de `src/routes/requests.routes.js` para los tres endpoints. Respeta la
> estructura de archivos ya existente (app.js, server.js, data/requests.js). No agregues nada
> fuera del contrato: sin base de datos, sin TypeScript, sin autenticación, sin capas de
> controladores/servicios, sin PUT/PATCH/DELETE, sin dependencias nuevas, sin frontend."

En la fase **Lite no usé IA** en absoluto: el análisis (`lite-analysis.md`) y las correcciones
salieron de ejecutar, observar y registrar por mi cuenta.

## What the AI proposed

Propuso completar únicamente `requests.routes.js` con los tres manejadores: `GET /` devolviendo
`res.status(200).json(requests)`, `GET /:id` buscando con `Number(req.params.id)` y devolviendo
`404` cuando no hay coincidencia, y `POST /` usando `generateId()`, fijando `status: 'open'` y
devolviendo `201` o `400`. Sugirió además validar el título con `trim()` para rechazar cadenas
en blanco. No tocó `app.js` ni `server.js`.

## What I accepted

- La implementación de los tres manejadores, porque **coincidía línea por línea con el contrato
  que ya había escrito** (estados `200`/`201`/`404`/`400` y forma del objeto creado).
- El uso de `Number(req.params.id)` para comparar el id como número y no como string.
- La validación con `trim()` para rechazar un título en blanco (también está en mi contrato como
  decisión).
- El uso de `generateId()` desde `data/requests.js`, en vez de manejar el contador dentro del
  router: respeta la separación de responsabilidades del template.

## What I changed or rejected

- **Rechacé** una variante que devolvía el error de validación con `res.status(200).json(...)` y
  un campo `success: false`: contradice la regla transversal de mi contrato (un error va con su
  código de estado real, `400`).
- **Rechacé** la sugerencia de añadir un endpoint de filtrado por estado (`/requests?status=`).
  No está en el contrato de este incremento; habría añadido contrato que documentar y comprobar.
- **Rechacé** la propuesta de meter el arreglo y el contador dentro del router "para tener todo
  junto": eso rompe la razón de ser de `data/requests.js` (aislar el origen de los datos).
- **Modifiqué** la ubicación de la validación: la dejé antes de construir el objeto y de hacer
  `push`, para garantizar que una petición inválida **no muta** el arreglo.

## How I verified it

No me bastó con que compilara: ejecuté los casos C1–C7 del documento de casos de prueba con
`curl -i` y registré el estado y el cuerpo observados.

- `GET /requests` → `200` + arreglo.
- `GET /requests/2` → `200` + objeto.
- `GET /requests/999` → `404` + `{"error":"Request not found"}`.
- `POST /requests` con título → `201` + objeto con `id: 4` y `status: "open"`.
- `POST /requests` con `{}` → `400` + `{"error":"Title is required"}`.
- `POST /requests` con `title: "   "` → `400` + `{"error":"Title is required"}`.
- `GET /requests` después de esos tres → la lista contiene **solo** la creación válida (id 4);
  C5 y C6 no agregaron nada.

El detalle completo está en `casos-de-prueba.md`.

## What I still do not understand

- El comportamiento por defecto de Express ante un body JSON mal formado (devuelve un `400` con
  HTML, no con mi formato `{ "error": ... }`). Sé que ocurre, pero todavía no sé cuál sería la
  forma correcta de unificar ese caso con mi contrato de errores sin salirme de las exclusiones.
- Por qué `res.json()` y `res.status().json()` se comportan igual para el `200`, y en qué casos
  conviene ser explícito con `res.status(200)` aunque sea redundante.
- Cómo se comprobaría automáticamente todo esto con pruebas, sin abrir un puerto (mencionaron que
  `app.js` puede montarse en una prueba; todavía no sé cómo se haría).
