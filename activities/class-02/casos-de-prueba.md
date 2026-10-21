# Casos de prueba manuales

> Verificación manual de las dos APIs. Ambas escuchan en `http://localhost:3000`, así que no
> pueden correr a la vez: se prueba una, se detiene con `Ctrl + C` y se prueba la otra.
>
> La columna **Resultado esperado** describe lo que exige el contrato HTTP. La columna
> **Resultado observado** es lo que devolvió el servidor, capturado con `curl -i`.

---

## Parte A — Request API Lite (versión de partida)

```bash
cd activities/class-02/lite-api
npm install
node server.js
```

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| A1 | `GET /getRequests` | `200` + arreglo JSON con las solicitudes | ✅ `200` + arreglo con las 3 solicitudes |
| A1b | `GET /requests` | `200` + arreglo JSON con las solicitudes | ❌ `404` + HTML `Cannot GET /requests` |
| A2 | `GET /requests/1` | `200` + objeto de la solicitud 1 | ✅ `200` + objeto de la solicitud 1 |
| A3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ❌ `200` + `{"error":"Request not found"}` |
| A4 | `POST /requests` con título | `201` + objeto creado con `id` y `status: "open"` | ❌ `200` + objeto creado (`id: 4`, `status: "open"`) |
| A5 | `POST /requests` sin `title` | `400` + `{"error":"Title is required"}` y ningún dato nuevo | ❌ `200` + objeto creado con `id: 5` **sin título** |
| A6 | `GET` de la colección tras A4 y A5 | `200` + lista con la de A4 y **sin** la de A5 | ❌ `200` + lista con **ambas** (incluida la incompleta) |

### Diferencias encontradas

| Fila | Defecto que revela |
| ---- | ------------------ |
| A1 / A1b | La ruta de listado usa un verbo (`/getRequests`) en vez del sustantivo del recurso (`/requests`). |
| A3 | Estado y cuerpo se contradicen: `200 OK` con cuerpo de error. |
| A4 | La creación responde `200` en lugar de `201`: no distingue crear de leer. |
| A5 / A6 | No valida el `title`: guarda y persiste una solicitud incompleta. |

---

## Parte B — Request API Lite corregida

```bash
cd activities/class-02/lite-api
node server.js
```

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| B1 | `GET /requests` | `200` + arreglo JSON con las solicitudes | ✅ `200` + arreglo |
| B2 | `GET /requests/1` | `200` + objeto de la solicitud 1 | ✅ `200` + objeto |
| B3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ✅ `404` + `{"error":"Request not found"}` |
| B4 | `POST /requests` con título válido | `201` + objeto creado | ✅ `201` + objeto creado (`id: 4`) |
| B5 | `POST /requests` sin `title` | `400` + `{"error":"Title is required"}` | ✅ `400` + `{"error":"Title is required"}` |
| B6 | `GET /getRequests` | `404` (la ruta con verbo ya no existe) | ✅ `404` |

---

## Parte C — Request API Full

```bash
cd activities/class-02/project
npm install
node src/server.js
```

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| C1 | `GET /requests` | `200` + arreglo JSON con las solicitudes | ✅ `200` + arreglo |
| C2 | `GET /requests/2` | `200` + objeto de la solicitud 2 | ✅ `200` + objeto |
| C3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ✅ `404` + `{"error":"Request not found"}` |
| C4 | `POST /requests` con título válido | `201` + objeto creado con `id` nuevo y `status: "open"` | ✅ `201` + objeto (`id: 4`, `status: "open"`) |
| C5 | `POST /requests` con body `{}` | `400` + `{"error":"Title is required"}` | ✅ `400` + `{"error":"Title is required"}` |
| C6 | `POST /requests` con `title` en blanco | `400` + `{"error":"Title is required"}` | ✅ `400` + `{"error":"Title is required"}` |
| C7 | `GET /requests` después de C4, C5 y C6 | `200` + lista solo con la de C4 | ✅ `200` + lista con las 3 originales y la de C4 (id 4); C5 y C6 no agregaron nada |

### Estado de la verificación

- **¿Quedó alguna respuesta en `501`?** No. Los tres endpoints están implementados.
- **¿Alguna respuesta devolvió un estado distinto al esperado?** No. Todas coinciden con el
  contrato de `docs/http-contract.md`.

---

## Evidencia cruda (extracto)

```txt
# A3 (Lite original) — contradicción estado/cuerpo
$ curl -i http://localhost:3000/requests/999
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"error":"Request not found"}

# B3 (Lite corregida) — mismo caso, estado correcto
$ curl -i http://localhost:3000/requests/999
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"error":"Request not found"}

# C4 (Full) — creación correcta
$ curl -i -X POST http://localhost:3000/requests -H "Content-Type: application/json" \
    -d '{"title":"Air conditioning is noisy","description":"Room 110 makes noise all morning.","priority":"low"}'
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Air conditioning is noisy","description":"Room 110 makes noise all morning.","status":"open","priority":"low"}

# C5 (Full) — validación correcta, sin mutar datos
$ curl -i -X POST http://localhost:3000/requests -H "Content-Type: application/json" -d '{}'
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":"Title is required"}
```
