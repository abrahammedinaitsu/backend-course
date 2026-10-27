# INC-701 — Identificador inválido produce error interno

**Tipo:** bug reportado por soporte · **Prioridad:** alta · **Estado inicial:** reported

## Reporte de soporte (literal)

> "Some request identifiers return an internal server error."
>
> Un integrador está construyendo enlaces hacia solicitudes y algunos de sus
> enlaces devuelven error 500. Dice que 'a veces funciona y a veces no'.

## Petición reproducible

```http
GET /requests/not-a-number
Authorization: Bearer <token válido de cualquier usuario>
```

## Comportamiento actual

```http
500 Internal Server Error
```

El terminal del servidor muestra un error técnico de PostgreSQL.

## Comportamiento esperado

```http
400 Bad Request
```

```json
{
  "error": {
    "code": "INVALID_REQUEST_ID",
    "message": "Request id must be a positive integer."
  },
  "requestId": "req_..."
}
```

## Reglas del contrato

* Un identificador con **formato inválido** es un problema del consumidor: `400`.
* Un identificador **bien formado que no existe** sigue siendo `404 REQUEST_NOT_FOUND` — eso no cambia.
* La validación debe rechazar: texto, decimales, cero, negativos y valores como `12abc` (un `parseInt` ingenuo los acepta como `12`).
* La consulta SQL **no debe ejecutarse** cuando el formato es inválido.
* El error técnico de PostgreSQL nunca viaja en la respuesta.

## Definición de terminado

* [ ] El incidente se reprodujo antes de tocar código (evidencia en `incident-report.md`).
* [ ] `GET /requests/not-a-number` responde `400 INVALID_REQUEST_ID`.
* [ ] `GET /requests/999999999` sigue respondiendo `404`.
* [ ] Existe una prueba de regresión que cubre los casos límite.
* [ ] `npm test` completo en verde.
