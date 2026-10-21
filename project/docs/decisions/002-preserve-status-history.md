# Preserve request status history

> Decisión 002 · va en `project/docs/decisions/002-preserve-status-history.md`.
> Igual que en la 001: sin costos reconocidos en ambas opciones no hay decisión, hay propaganda.

## Context

El requerimiento pide que una solicitud pueda **cambiar de estado** (abrirse, empezar a
atenderse, resolverse, cerrarse o cancelarse) y, además, que exista un **registro de auditoría**:
poder responder "¿cuándo pasó esta solicitud a `in_progress` y desde qué estado?". Hasta la
clase 3, la solicitud tenía una sola columna `status` que guardaba únicamente el *presente*:
cada cambio **borraba** el valor anterior. Había que decidir si la historia se conserva.

## Options

### Option 1: Keep only the current status

Benefits:

- Menos datos: una sola fila por solicitud, sin tabla adicional que crezca con cada cambio.
- Menos código: no hay que insertar eventos, ni coordinar dos escrituras, ni mapear eventos.
- Sin transacción: un único `UPDATE` deja el estado correcto, sin riesgo de inconsistencia
  entre dos tablas.

Costs:

- Se pierde la historia: el cambio de estado **destruye** el valor anterior. Nadie puede
  auditar qué se pidió, qué se decidió ni cuándo.
- Imposible diagnosticar: ante "¿cuándo se resolvió?", no hay respuesta, solo el estado actual.
- No se pueden construir consultas sobre el pasado (tiempos de atención, reaperturas, etc.).

### Option 2: Store every status transition

Benefits:

- Historia completa y auditable: cada cambio es un **hecho** con su propia fila (`previo`,
  `nuevo`, `cuándo`). El nacimiento también se registra (`NULL → open`).
- Habilita consultas nuevas: línea de tiempo de una solicitud, cuánto tiempo estuvo en cada
  estado, cuántas reaperturas hubo (`resolved → in_progress`).
- Aprovecha la base: la `FOREIGN KEY` garantiza que no exista historia huérfana.

Costs:

- Datos adicionales: una tabla nueva que crece con **cada** transición, no con cada solicitud.
- Código adicional: un `INSERT` de historia en cada cambio y en la creación, más el endpoint
  `GET /requests/:id/history` y su mapper.
- **Problema de consistencia**: el `UPDATE` del estado y el `INSERT` de la historia son dos
  escrituras. Si la segunda falla, quedaría un estado cambiado **sin su historia** — una
  mentira silenciosa. Obliga a una **transacción** (que es justamente la herramienta que la
  clase 4 introduce).

## Decision

Elegimos la **opción 2**: preservar la historia. El requerimiento pone la auditoría en el
centro, y la opción 1 la destruye. El costo de consistencia no es un defecto de la opción 2
sino una consecuencia que se resuelve con una transacción: ambas escrituras forman **una sola
unidad lógica**. La opción 1 tendría sentido en un dominio donde el pasado no importe (un
contador desechable); aquí, no.

## Consequences

**What we gain:** auditoría real, consultas sobre el pasado, y un nacimiento registrado. La
solicitud deja de ser solo su presente: conserva su recorrido.

**What additional data and code appear:** una segunda tabla `request_status_history` (con su
migración 002 y su índice por `request_id`), un `INSERT` de historia en `create` y en cada
cambio de estado, `findHistory` en el store, `mapHistoryRow` en el mapper, y el endpoint
`GET /requests/:id/history` en la ruta y el service.

**What consistency problem must be handled:** el estado y su evento deben escribirse juntos o
no escribirse. `withTransaction` (un solo cliente, `BEGIN`/`COMMIT`/`ROLLBACK`/`release en
finally`) lo garantiza. La creación también es una unidad: la solicitud y su nacimiento van
juntos.

**What queries become possible:** la línea de tiempo de una solicitud; cuánto tiempo pasó en
cada estado (diferencia entre `changed_at` consecutivos); cuántas veces se reabrió; qué
solicitudes fueron canceladas y desde qué estado.

**What may need to change later:** hoy el historial no guarda **quién** hizo el cambio — no hay
usuarios todavía (llegan en una clase posterior). Cuando existan, esta tabla ganará una columna
de autor. Además, si el volumen crece, el historial necesitará retención o archivado; y la
concurrencia (dos cambios simultáneos) queda **nombrada pero no resuelta** por esta decisión:
la transacción protege la atomicidad de *una* operación, no la coordinación entre *dos*.
