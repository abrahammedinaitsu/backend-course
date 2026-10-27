# INC-702 — Prioridad inválida produce error interno

**Tipo:** bug reportado por soporte · **Prioridad:** alta · **Estado inicial:** reported

## Reporte de soporte (literal)

> "Updating some priorities produces an internal server error."
>
> Un agente intentó marcar una solicitud como 'critical' desde una
> herramienta externa y recibió un error 500 sin más explicación.

## Petición reproducible

```http
PATCH /requests/:id
Authorization: Bearer <token de un agente>
Content-Type: application/json
```

```json
{
  "priority": "critical"
}
```

Usa una solicitud del seed en estado `open` (por ejemplo, una de las que
lista `GET /requests?status=open`).

## Comportamiento actual

```http
500 Internal Server Error
```

El terminal muestra que una **restricción de PostgreSQL** rechazó el valor.

## Comportamiento esperado

```http
400 Bad Request
```

```json
{
  "error": {
    "code": "INVALID_PRIORITY",
    "message": "Priority must be low, medium or high."
  },
  "requestId": "req_..."
}
```

## Reglas del contrato

* Las prioridades válidas son `low`, `medium` y `high` — desde la clase 3.
* La **aplicación** valida el contrato antes de ejecutar SQL (primera defensa).
* La **restricción CHECK** de PostgreSQL se conserva intacta (segunda defensa):
  protege la integridad si la aplicación falla o si otro proceso escribe en la tabla.
* Eliminar la restricción para "resolver" el 500 no es una corrección aceptable.

## Definición de terminado

* [ ] El incidente se reprodujo antes de tocar código (evidencia en `incident-report.md`).
* [ ] `PATCH` y `POST` con prioridad inválida responden `400 INVALID_PRIORITY`.
* [ ] Un cambio de prioridad válido sigue funcionando (`low` → `high` responde 200).
* [ ] La restricción CHECK sigue existiendo en la base.
* [ ] Existe una prueba de regresión y `npm test` completo está en verde.
