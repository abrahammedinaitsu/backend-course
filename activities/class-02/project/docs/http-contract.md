# Contrato HTTP — Request API Full

> Escrito **antes** de implementar los manejadores. El contrato es la promesa que hace la API;
> el código es la manera de cumplirla.

## Recurso

Una **solicitud** (`request`) representa un pedido de mantenimiento hecho por alguien de la
institución: algo que se debe arreglar o revisar (una proyectora, una silla, el Wi-Fi). Cada
solicitud se identifica con un `id` numérico y arranca en estado `open`.

### Forma del recurso

| Campo         | Tipo    | Obligatorio | Quién lo asigna | Notas |
| ------------- | ------- | ----------- | --------------- | ----- |
| `id`          | integer | Sí          | Servidor        | Único e incremental. El cliente no lo envía. |
| `title`       | string  | Sí          | Cliente         | No puede faltar ni estar en blanco. Se recorta con `trim()`. |
| `description` | string  | No          | Cliente         | Si no llega, queda `undefined` (se omite en el JSON). |
| `status`      | string  | Sí          | Servidor        | Siempre `"open"` al crear. El cliente no lo controla. |
| `priority`    | string  | No          | Cliente         | Sin validación de valores en este incremento. |

---

## Endpoint 1 — Listar solicitudes

| Elemento              | Valor |
| --------------------- | ----- |
| Método                | `GET` |
| Ruta                  | `/requests` |
| Entrada               | Ninguna |
| Respuesta de éxito    | `200 OK` + arreglo JSON con todas las solicitudes |
| Respuestas de error   | Ninguna definida (el arreglo puede venir vacío) |

**Ejemplo de respuesta**

```json
[
  { "id": 1, "title": "Projector does not turn on", "description": "The projector in room 204 shows no image during class.", "status": "open", "priority": "high" },
  { "id": 2, "title": "Broken chair in the lab", "description": "One chair in the computer lab has a loose back rest.", "status": "in-progress", "priority": "medium" }
]
```

---

## Endpoint 2 — Consultar una solicitud

| Elemento              | Valor |
| --------------------- | ----- |
| Método                | `GET` |
| Ruta                  | `/requests/:id` |
| Entrada               | Path parameter `id` (llega como string, se compara como número) |
| Respuesta de éxito    | `200 OK` + objeto JSON de la solicitud |
| Respuestas de error   | `404 Not Found` + `{"error":"Request not found"}` |

**Ejemplo de respuesta (éxito)**

```json
{ "id": 1, "title": "Projector does not turn on", "description": "The projector in room 204 shows no image during class.", "status": "open", "priority": "high" }
```

**Ejemplo de respuesta (error)**

```json
{ "error": "Request not found" }
```

---

## Endpoint 3 — Crear una solicitud

| Elemento              | Valor |
| --------------------- | ----- |
| Método                | `POST` |
| Ruta                  | `/requests` |
| Entrada               | Body JSON `{ "title", "description"?, "priority"? }` |
| Respuesta de éxito    | `201 Created` + objeto JSON de la solicitud creada (con `id` y `status: "open"`) |
| Respuestas de error   | `400 Bad Request` + `{"error":"Title is required"}` (no modifica los datos) |

**Ejemplo de body de la petición**

```json
{ "title": "Air conditioning is noisy", "description": "Room 110 makes noise all morning.", "priority": "low" }
```

**Ejemplo de respuesta (éxito)**

```json
{ "id": 4, "title": "Air conditioning is noisy", "description": "Room 110 makes noise all morning.", "status": "open", "priority": "low" }
```

**Ejemplo de respuesta (error de validación)**

```json
{ "error": "Title is required" }
```

---

## Reglas transversales

1. **¿Qué `Content-Type` devuelven todas las respuestas?** `application/json; charset=utf-8`
   (Express lo fija al usar `res.json()`).
2. **¿Qué estado corresponde a una ruta que no existe en esta API?** `404 Not Found`
   (lo genera Express por defecto al no haber ninguna ruta que coincida).
3. **¿Qué forma tiene siempre un cuerpo de error?** Un objeto JSON con una sola clave
   `error` cuyo valor es un string: `{ "error": "<mensaje>" }`.
4. **¿Qué campos ignora el servidor si el cliente los envía en el body?** Ignora cualquier
   campo que no sea `title`, `description` o `priority` (por ejemplo, un `id` o un `status`
   enviados por el cliente no se usan: los asigna el servidor).

## Decisiones que tomaste y por qué

- **`400` y no `404` cuando falta el título:** `404` diría "el recurso solicitado no existe",
  pero el recurso `/requests` sí existe; el problema es que la petición del cliente está
  incompleta. Por eso `400`.
- **`201` y no `200` en la creación:** se produjo un recurso nuevo, y `201 Created` es la
  forma en que el protocolo comunica ese hecho. `200` no distingue crear de leer.
- **Filtrar no entra aquí:** si más adelante se filtra por estado, será un *query parameter*
  (`/requests?status=open`) porque no cambia cuál es el recurso, solo cómo se presenta.
- **Campos opcionales ausentes:** si `description` o `priority` no llegan, el objeto creado
  los deja en `undefined`; en JSON esas claves simplemente no aparecen. No se inventan valores.
- **Validación con `trim()`:** un título de solo espacios se considera inválido (equivale a
  faltante), para no guardar registros en blanco.
