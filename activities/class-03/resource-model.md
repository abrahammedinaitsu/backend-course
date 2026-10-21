# Resource model — Request

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> No toda palabra del requerimiento se convierte en ruta o campo: parte del trabajo es
> decidir qué entra, qué espera y qué se pregunta.

## Nombre del recurso

**Request** (solicitud de mantenimiento). Representa un pedido concreto de arreglo o revisión
hecho por alguien de la institución (una proyectora que no enciende, una silla rota, el Wi-Fi
que se cae). Tiene una identidad propia, un ciclo de vida y una historia que debe poder
consultarse.

## Propiedades

| Propiedad     | Tipo    | Ejemplo |
| ------------- | ------- | ------- |
| `id`          | number  | `4` |
| `title`       | string  | `"Projector does not turn on"` |
| `description` | string  | `"The projector in room 204 shows no image during class."` |
| `status`      | string  | `"open"` |
| `priority`    | string  | `"high"` |
| `createdAt`   | string (ISO 8601) | `"2026-10-21T00:20:00.000Z"` |
| `updatedAt`   | string (ISO 8601) | `"2026-10-21T00:20:00.000Z"` |

## Campos requeridos

- `title`: sin título no hay solicitud. Es el mínimo que permite identificarla en una lista.
  No puede venir ausente ni en blanco (solo espacios).

## Campos opcionales

- `description`: si falta, la solicitud existe igual; describe el problema con más detalle.
  Si no llega, queda `undefined` (la clave no aparece en el JSON). No se inventa un texto.
- `priority`: si falta, el servidor aplica `"medium"` por defecto. Valores válidos:
  `"low"`, `"medium"`, `"high"`.

## Campos generados por el servidor

- `id`: lo asigna el servidor con un contador que solo avanza. Si lo asignara el cliente, dos
  clientes podrían chocar y elegir el mismo número. **El `id` del body se ignora.**
- `status`: siempre nace `"open"`. El cliente no puede crear una solicitud cerrada o cancelada;
  es una regla del dominio, no una preferencia. **El `status` del body se ignora.**
- `createdAt`, `updatedAt`: los genera el servidor en el momento de crear. El reloj del cliente
  no es confiable ni comparable.

## Estados permitidos

Lista cerrada de valores de `status`:

- `open` — creada y aún sin atender.
- `in_progress` — alguien la está atendiendo.
- `resolved` — se cree que está lista; espera confirmación.
- `closed` — confirmada y terminada. **Terminal.**
- `cancelled` — interrumpida antes de completarse. **Terminal.**

## Reglas

- Nunca existirá una solicitud sin `title` (ausente o en blanco).
- Nunca existirá una solicitud con `priority` fuera de `{ low, medium, high }`.
- Nunca existirá una solicitud con un `status` fuera de los cinco permitidos.
- Nunca existirá una solicitud cuyo `status` haya cambiado por una transición no permitida por
  el mapa de estados.
- Nunca se creará una solicitud en estado distinto de `open`.
- Nunca se modificará una solicitud en estado terminal (`closed`, `cancelled`).
- El `id` nunca se repite mientras el proceso vive; el contador solo avanza.
- `updatedAt` nunca será anterior a `createdAt`.

## Dudas

- El requerimiento no dice si `description` debería tener un máximo de longitud ni si hay
  longitudes mínimas. Hoy no se valida longitud: queda como duda, no como funcionalidad.
- El requerimiento no dice si un `resolved` debería guardar quién lo resolvió. No hay usuarios
  aún (llegan en la clase 5); queda fuera.
- No está dicho si se pueden editar `title`/`description` de una solicitud ya `closed`. Hoy la
  regla de terminal aplica a **cualquier** modificación; conviene confirmarlo con quien pide.
