# AI usage

> Regla de la entrega: la IA puede proponer código, pero no puede decidir silenciosamente el
> contrato o las reglas del sistema. Solo se usó **después** de la marca `class-03-design`.

## My design before using AI

Antes del primer prompt ya estaban decididos y commiteados (tag `class-03-design`):

- El **modelo del recurso** (`resource-model.md`): siete propiedades, requeridos/opcionales/
  del servidor, la lista cerrada de estados y las invariantes.
- El **contrato HTTP** (`http-contract.md`): los cuatro endpoints, el formato de error
  `{ error: { code, message } }` y los siete códigos de error.
- El **mapa de transiciones** (`transition-map.md`): `open → in_progress → resolved → closed`,
  salidas a `cancelled`, retorno `resolved → in_progress`, y terminales `closed`/`cancelled`.
- La **matriz de pruebas** (`test-matrix.md`) con el resultado esperado de cada caso.

La IA no podía cambiar nada de eso en silencio.

## What I asked the AI

1. Revisar mi contrato y detectar casos o errores que hubiera olvidado.
2. Proponer la implementación de `PATCH /requests/:id` respetando mi máquina de estados.
3. Sugerir casos de prueba adicionales para la matriz.

## What the AI proposed

- Señaló que mi contrato **no distinguía** el caso "PATCH sin campos modificables"
  (`NOTHING_TO_UPDATE`); lo tenía implícito pero no con su propio código de error.
- Propuso implementar PATCH con una función `applyPatch` que consulta `request-status.js`.
- Sugirió validar también el `title` en PATCH con `trim()` (coherente con la creación).
- Proporcionó casos extra: filtro combinado y envío de campos del servidor en el POST.

## What I accepted

- El código de error **`NOTHING_TO_UPDATE`** (`400`): era un hueco real de mi contrato. Beneficio:
  el cliente detecta un body mal armado en vez de recibir un `200` silencioso. Costo:
  actualizar el contrato (lo hice **antes** que el código) y añadir un caso de prueba. Contrato
  actualizado en `http-contract.md` (tabla de PATCH) y en la matriz.
- La validación de `title` con `trim()` en PATCH: coherente con la creación y con la invariante
  "nunca existirá una solicitud sin título".
- Los casos de prueba adicionales: filtro combinado y campos del servidor en POST.

## What I rejected or changed

- **Rechacé** una propuesta de añadir `DELETE /requests/:id`: contradice la decisión 001
  (cancelar en vez de borrar) y las exclusiones de la entrega.
- **Rechacé** una "capa de servicio" intermedia (`requests.service.js`) para tres endpoints en
  memoria: las exclusiones prohíben capas `controllers/services/repositories`. Habría añadido
  complejidad sin un problema que la justifique.
- **Rechacé** cambiar el código de transición inválida a `400`: mi contrato lo fija en `409`
  (la petición está bien formada; el estado la vuelve imposible). La IA lo propuso como
  "más simple", pero simplificar rompía una decisión documentada.
- **Rechacé** una librería de validación (zod): no está permitida por las exclusiones.
- **Cambié** la forma en que la IA sugería manejar el terminal: propuso comprobar el estado
  dentro de cada rama de actualización; lo centralicé en una sola comprobación al inicio de
  PATCH, para que la regla viva en un solo lugar.

## How I verified the result

Ejecuté la matriz completa con `curl -i` contra el proyecto corriendo y registré el resultado
observado. Los casos clave:

- `PATCH /requests/2` con `{"status":"closed"}` desde `in_progress` → `409 INVALID_STATUS_TRANSITION`.
- `PATCH /requests/1` (llevada a `closed`) con `{"title":"..."}` → `409 REQUEST_IN_TERMINAL_STATUS`.
- `GET /requests?status=abierta` → `400 UNKNOWN_FILTER`.
- `PATCH /requests/1` con `{"id":7}` → `400 NOTHING_TO_UPDATE`.
- `POST /requests` con `status:"closed"` e `id:999` → `201`, `status:"open"`, id generado.

Todo el detalle y las salidas literales están en `test-matrix.md`.

## What I still do not understand

- Cómo sería una prueba automatizada que monte `app.js` sin abrir un puerto (lo mencionaron en
  la clase 2 y ahora veo el valor, pero todavía no sé implementarlo).
- Si el contador `nextRequestId` que se reinicia al reiniciar el proceso podría repetir ids que
  un cliente recuerda; entiendo la limitación, pero no cuál sería la solución mínima correcta.
- Cuál es el límite exacto entre "ignorar campos desconocidos" y "rechazar el body": elegí
  ignorar por coherencia con la creación, pero no sé si eso vale para todos los casos.
