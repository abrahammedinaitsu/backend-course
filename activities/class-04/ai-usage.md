# AI usage

> Regla de la entrega: la IA revisa DESPUÉS del diseño (`class-04-design`) y no puede cambiar
> en silencio tablas, columnas, tipos, restricciones, rutas, estados, transiciones, códigos,
> estructura ni la decisión del historial.

## My design before using AI

Antes del primer prompt ya estaban decididos y commiteados (tag `class-04-design`), en
`activities/class-04/`:

- **`data-model.md`** — las dos tablas completas: tipos, nulos, defaults, constraints, la
  relación 1→\*, el reparto de reglas base/aplicación y por qué `previous_status` admite NULL.
- **`persistence-contract.md`** — las cinco operaciones del store con entrada, consulta,
  salida, ausencia de datos, errores, necesidad de transacción y mapeo.
- **`query-matrix.md`** — operación → SQL parametrizado → parámetros → resultado.
- **`transaction-plan.md`** — las ocho preguntas de la unidad, con la creación también como
  unidad.
- **`error-map.md`** — las seis categorías, las situaciones concretas y qué se loggea.
- **`test-matrix.md`** — los doce casos mínimos con lo esperado.

La IA no podía tocar nada de eso en silencio.

## What I asked the AI

1. Revisar mi esquema y mis constraints y señalar reglas mal repartidas entre base y app.
2. Revisar mis consultas del store buscando SQL no parametrizado o parámetros mal numerados.
3. Revisar mi transacción (`withTransaction`) buscando clientes sin liberar o consultas fuera
   del cliente.
4. Proponer casos de prueba adicionales para la matriz.
5. Explicar los códigos de error de `pg` para clasificar bien las categorías persistencia/
   infraestructura.

> Nunca pegué la `DATABASE_URL` ni credenciales en el chat: trabajé con los nombres de columna,
> el SQL y los mensajes de error.

## What the AI proposed

- Señaló que **`BIGINT` vuelve de `pg` como string** y que, si el mapper no lo convierte, el
  contrato de la clase 3 se rompe en silencio (`id` dejaría de ser número). Lo verifiqué yo
  mismo con una petición real: efectivamente llegaba `"id":"7"`.
- Sugirió usar `pool.query()` también para las consultas del `UPDATE`/`INSERT` de historia
  "para simplificar". Lo rechacé (ver abajo).
- Propuso cerrar `request_status_history` con `ON DELETE CASCADE`.
- Proporcionó la tabla de códigos `pg` (`23514` CHECK, `23503` FK, `23505` unique) para
  mapearlos a `PERSISTENCE_CONSTRAINT`, y `ECONNREFUSED`/`57P03` a `DATABASE_UNAVAILABLE`.
- Casos de prueba extra: filtro combinado y `history` de una solicitud inexistente.

## What I accepted

- **Coercionar `id` a `Number` en el mapper.** Beneficio: preserva el contrato (el `id` sigue
  siendo número). Costo: un detalle que hay que recordar (el contrato se protege en el mapper).
  No tocó esquema ni contrato, así que no hubo documento que actualizar; sí lo verifiqué con
  `curl`.
- **La tabla de códigos `pg`** para clasificar errores. Beneficio: `500`/`503` correctos y sin
  filtrar secretos. Costo: una tabla de mapeo que mantener. Actualicé `error-map.md` con la
  columna "Mapeo pg → respuesta" y lo verifiqué con el fallo controlado y el 503.
- **Los dos casos de prueba extra**: filtro combinado y `history` de inexistente.

## What I rejected or changed

- **Rechacé usar `pool.query()` dentro de la unidad transaccional.** Es exactamente la
  confusión peligrosa del bloque 8: cada `pool.query()` puede tomar **otra** conexión, y las
  consultas quedarían **fuera** de la transacción sin ningún error visible. Mi diseño exigía
  un solo cliente (`pool.connect()`), y lo mantuve. Cambiarlo habría roto la atomicidad y con
  ella la decisión 002.
- **Rechacé `ON DELETE CASCADE` en la historia.** El proyecto **no borra** solicitudes
  (decisión 001 vigente): un `CASCADE` prepararía un borrado que no debe existir. Si algún día
  se permitiera borrar, la FK sin cascade obligaría a decidirlo de nuevo, con la historia en
  mente.
- **Rechacé un ORM / `supabase-js`** para "escribir menos SQL": las exclusiones los prohíben y
  esconderían justo lo que la clase quiere enseñar (la integración directa con PostgreSQL).
- **Rechacé añadir índices "por si acaso"** sobre `title`/`priority`: cada índice encarece toda
  escritura. Dejé solo el índice por `request_id` (acompaña `GET /requests/:id/history`, una
  consulta real) y documenté `status` como candidato, no como tarea.
- **Cambié** el manejo del error del servicio: en vez de dejar que cada ruta traduzca sus
  errores, introduje `HttpError` (con `code` y `httpStatus`) y un **manejador central** en
  `app.js`. Así la tabla de traducción vive en un solo lugar.

## How I verified the result

Ejecuté la matriz completa con `curl` contra el proyecto corriendo y contra la base real. Los
casos clave:

- **Persistencia**: `POST` → `201` con `id:6` → **reinicio de Express** → `GET /requests/6` →
  `200` con los mismos datos (y la historia intacta).
- **Rollback**: con el fallo inyectado, `PATCH /requests/3` → `500 PERSISTENCE_CONSTRAINT`, y la
  consulta posterior mostró `status` original y `updated_at` sin cambiar.
- **Infraestructura**: host inalcanzable → `503 DATABASE_UNAVAILABLE`, la API siguió viva.
- **Contrato**: `id` numérico tras la corrección; `POST` con `status`/`id` del cliente los
  ignora (nace `open`, id generado por la base).

Todo el detalle y las salidas literales están en `test-matrix.md`.

## What I still do not understand

- La **concurrencia**: si dos personas leen `open` a la vez y ambas intentan una transición
  válida, la segunda pisa a la primera y nadie recibe error. La transacción protege la
  atomicidad de *una* operación, no la coordinación entre dos. Sé que se nombra `SELECT … FOR
  UPDATE`, pero no sabría implementarlo ni justificar su costo todavía.
- Cómo se llevaría el **versionado real de migraciones** (saber cuáles ya se aplicaron) sin una
  herramienta: hoy es disciplina de numerar y ejecutar a mano en el SQL Editor.
- Si el `ON DELETE` por defecto (sin cascade) es lo correcto a largo plazo o si conviene
  `RESTRICT` explícito para que la intención quede escrita.
