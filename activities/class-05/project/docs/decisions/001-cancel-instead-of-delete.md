# Cancel requests instead of deleting them

## Context

El requerimiento pide que una solicitud pueda dejar de atenderse y que su **historia se
preserve**: quién la reportó necesita poder ver después qué pasó con su pedido. Había que
decidir si "dejar de atender" borra el registro o lo marca con un estado. La API de la clase 2
solo creaba y consultaba; hasta ahora no existía ninguna operación que quitara una solicitud.

## Options

### Option 1: Physically delete the request

Benefits:

- El arreglo en memoria se mantiene pequeño: no acumula solicitudes que ya no aplican.
- Es la operación que CRUD sugiere "de paso": `DELETE /requests/:id` parece completa.
- El cliente no tiene que conocer un estado adicional; la solicitud simplemente desaparece.

Costs:

- Se pierde la historia: nadie puede auditar qué se pidió y qué se decidió sobre ello.
- El `id` liberado puede reutilizarse (o dejar huecos), lo que complica la identidad.
- Un frontend imaginario que ya mostró esa solicitud tendría que manejar un "ya no existe" que
  no distingue entre "se canceló" y "nunca existió".

### Option 2: Preserve it with status cancelled

Benefits:

- La historia permanece: la solicitud sigue consultable con `status: "cancelled"`.
- No se rompe la identidad: el `id` vive para siempre y el contador solo avanza.
- "Cancelar" y "cerrar" cuentan historias distintas (interrumpir vs culminar), y la API las
  distingue.

Costs:

- El arreglo crece con solicitudes que ya no se atienden; hay que filtrar para ver solo las
  activas.
- Aparece una regla nueva que proteger: `cancelled` es terminal y no admite más cambios.
- El cliente debe conocer y respetar el estado `cancelled`.

## Decision

Elegimos la **opción 2** para este sistema, hoy: las solicitudes se cancelan, no se borran. El
requerimiento pone la historia en el centro, y borrar la destruye. La cancelación se expresa
como una transición de estado (`PATCH /requests/:id` con `status: "cancelled"`), no como una
ruta nueva. La misma pregunta tendría otra respuesta válida en un dominio donde la
información sea desechable (por ejemplo, borradores temporales): ahí borrar sería correcto.
Esta decisión es de contexto, no una ley.

## Consequences

**What we gain:** historia completa, identidad estable y una distinción honesta entre cancelar
y cerrar. La API gana una regla más, pero vive en un solo lugar (`request-status.js`).

**What complexity appears:** `cancelled` y `closed` son terminales, y cualquier intento de
modificar una solicitud terminal debe rechazarse con `409 REQUEST_IN_TERMINAL_STATUS`. Además,
el store crece y hace falta filtrar por estado para trabajar cómodamente.

**What can no longer be done:** ya no existe una operación que libere espacio ni que haga
desaparecer una solicitud del listado por completo. Tampoco hay `DELETE`, así que un cliente
acostumbrado a borrar tendrá que aprender la transición.

**What may need to change later:** si el volumen crece y las canceladas estorban, podría
aparecer un archivado o una paginación (fuera del alcance de hoy). Cuando llegue una base de
datos real, esta decisión se mantiene, pero el borrado físico seguiría descartado por la misma
razón: la historia importa.

## Incómoda, reconocida

El arreglo en memoria nunca se vacía durante la vida del proceso: cancelar mucho deja muchas
solicitudes `cancelled` ocupando lugar. Es el precio de preservar la historia y hoy es aceptable
porque el sistema es pequeño; será lo primero a revisar si el volumen crece.
