# FEATURE-801 — Claim a request

**Tipo:** funcionalidad pedida por Producto · **Prioridad:** alta · **Estado inicial:** reported

## Historia

> Como agente, quiero tomar una solicitud abierta para indicar que soy
> responsable de atenderla.

## Endpoint

```http
POST /requests/:id/claim
```

No requiere body. La identidad del agente proviene del token.

## Reglas

* Requiere autenticación; solamente un `agent` puede reclamar (un `requester` recibe 403).
* La solicitud debe existir (404 si no), estar `open` y no estar asignada.
* `assignedTo` se obtiene del usuario autenticado — **jamás** del body.
  Si el body intenta enviar `assignedTo`, se rechaza con `400 SERVER_CONTROLLED_FIELD`
  (decisión del curso: hacer visible el contrato en vez de ignorar en silencio).
* El estado cambia a `in_progress` y `updatedAt` se actualiza.
* Se registra un evento de historial `request_claimed` (open → in_progress).
* **Asignación e historial deben ser consistentes**: la misma transacción.
* Repetir el claim devuelve `409 REQUEST_ALREADY_ASSIGNED`.
* Los estados terminales no pueden reclamarse (`409`).
* Se conserva el contrato de errores de la clase 7: `requestId` en errores y logs.

## Respuesta

```http
200 OK
```

```json
{
  "id": 42,
  "title": "Projector failure",
  "status": "in_progress",
  "assignedTo": "<uuid del agente>",
  "updatedAt": "2026-09-29T18:30:00.000Z"
}
```

Segundo intento:

```http
409 Conflict
```

```json
{
  "error": {
    "code": "REQUEST_ALREADY_ASSIGNED",
    "message": "The request is already assigned."
  },
  "requestId": "req_..."
}
```

## Matriz de comportamiento

| Usuario | Estado | Asignada | Resultado |
| --- | --- | ---: | --- |
| agent | open | No | `200` |
| requester | open | No | `403` |
| agent | open | Sí | `409 REQUEST_ALREADY_ASSIGNED` |
| agent | in_progress | No | `409` |
| agent | resolved | No | `409` |
| agent | closed | No | `409` |
| agent | cancelled | No | `409` |
| sin token | open | No | `401` |
| agent | inexistente | — | `404` |

## La pregunta del diseño

> ¿Estamos actualizando dos columnas o ejecutando una acción con
> significado para el negocio?

Claim expresa intención; el servidor deriva la identidad; se ejecutan
varias reglas; produce historial. No es un `PATCH` genérico de campos.

## Definición de terminado

* [ ] La matriz completa se cumple (pruebas de API en verde).
* [ ] La regla vive en la policy y se prueba SIN HTTP ni base.
* [ ] SQL solo en el store; el service no conoce Express.
* [ ] Migración 005 aplicada sin tocar migraciones anteriores.
* [ ] `npm run validate:class-08` termina en PASSED.
