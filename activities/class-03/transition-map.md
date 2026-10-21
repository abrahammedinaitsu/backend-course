# Transition map — ciclo de vida de una solicitud

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> Lo que no aparece como transición permitida está prohibido: los huecos también son reglas.

## Estados

- `open` — creada y aún sin atender.
- `in_progress` — alguien la está atendiendo.
- `resolved` — se cree que está lista; espera confirmación de quien la reportó.
- `closed` — confirmada y terminada. **Terminal.**
- `cancelled` — interrumpida antes de completarse. **Terminal.**

## Transiciones permitidas

| Desde | Hacia | ¿Qué la dispara? |
| ----- | ----- | ---------------- |
| `open` | `in_progress` | Alguien empieza a atender la solicitud. |
| `open` | `cancelled` | Se decide no atenderla (ya no aplica). |
| `in_progress` | `resolved` | El equipo cree que el trabajo está terminado. |
| `in_progress` | `cancelled` | Se abandona el trabajo a medias. |
| `resolved` | `in_progress` | La resolución no convenció; se reabre. |
| `resolved` | `closed` | Quien reportó confirma que quedó resuelto. |

## Transiciones inválidas notables

| Intento | Por qué se rechaza |
| ------- | ------------------ |
| `open` → `closed` | Nadie cierra lo que nunca se atendió: falta pasar por `in_progress` y `resolved`. |
| `open` → `resolved` | No puede estar resuelta sin haberse empezado. |
| `resolved` → `cancelled` | Si ya se resolvió, se confirma (`closed`) o se reabre (`in_progress`); cancelar un trabajo hecho no tiene sentido. |
| `resolved` → `open` | La reapertura vuelve a `in_progress`, no al inicio. |
| `closed` → cualquier estado | `closed` es terminal. |
| `cancelled` → cualquier estado | `cancelled` es terminal. |
| `open` → `open` (mismo estado) | No es una transición: no cambia nada. Se trata como transición inválida. |

## Estados terminales

`closed` y `cancelled` no admiten ninguna salida. Si se intenta modificar una solicitud en
estado terminal (por `PATCH`, aunque el body solo cambie `title`), la API responde:

- `409 Conflict` + `{ "error": { "code": "REQUEST_IN_TERMINAL_STATUS", "message": "..." } }`.

## Justificación

`resolved` puede volver a `in_progress` porque `resolved` es una **afirmación del equipo**
("creemos que está listo") que quien reportó puede refutar; ese ida y vuelta es parte normal
del trabajo. `closed`, en cambio, es la **confirmación final**: ya no hay nada que discutir, y
por eso es terminal. Distinguir `resolved` de `closed` es lo que permite reabrir sin
comprometer el cierre.

Cancelar no es lo mismo que cerrar: cerrar culmina el trabajo; cancelar lo interrumpe. Ambos
terminan, pero cuentan historias distintas — y por eso son dos estados y no uno.

`resolved → cancelled` se prohíbe porque un trabajo ya realizado no se cancela; la cancelación
solo tiene sentido antes de resolver.
