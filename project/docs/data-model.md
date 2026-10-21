# Data model — Request API v4

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> El esquema expresa decisiones sobre los datos, no solo su forma: cada NOT NULL,
> DEFAULT y CHECK debe poder defenderse.

## Tabla `requests`

| Columna | Tipo | ¿Nulo? | Default | Restricciones | ¿Quién lo genera? |
| ------- | ---- | ------ | ------- | ------------- | ----------------- |
| `id` | `BIGINT` | NO | `GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY` | PostgreSQL |
| `title` | `VARCHAR(200)` | NO | — | `NOT NULL` | Cliente (validado en app) |
| `description` | `TEXT` | SÍ | — | — | Cliente |
| `priority` | `VARCHAR(20)` | NO | `'medium'` | `CHECK (priority IN ('low','medium','high'))` | Cliente o default |
| `status` | `VARCHAR(30)` | NO | `'open'` | `CHECK (status IN ('open','in_progress','resolved','closed','cancelled'))` | App (nace `open`) |
| `created_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | PostgreSQL |
| `updated_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | App (se renueva en cada cambio) |

## Tabla `request_status_history`

| Columna | Tipo | ¿Nulo? | Default | Restricciones | Notas |
| ------- | ---- | ------ | ------- | ------------- | ----- |
| `id` | `BIGINT` | NO | `GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY` | PostgreSQL |
| `request_id` | `BIGINT` | NO | — | `FOREIGN KEY → requests(id)` | El evento pertenece a una solicitud |
| `previous_status` | `VARCHAR(30)` | SÍ | — | `CHECK (IS NULL OR IN (…5 estados))` | NULL = nacimiento (`NULL → open`) |
| `new_status` | `VARCHAR(30)` | NO | — | `CHECK (new_status IN (…5 estados))` | El estado al que se llegó |
| `changed_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | Cuándo ocurrió el hecho |

_(¿Por qué `previous_status` admite NULL?)_ Porque **el nacimiento no viene de ningún estado
anterior**: una solicitud no existe en estado "antes"; la primera fila de historia registra
`NULL → open`. Aquí NULL no es descuido: es un valor del dominio con significado documentado
("no hubo estado previo"), y por eso lleva su propio `CHECK` que lo permite explícitamente
frente a un estado inventado.

## Relaciones

```
requests (1) ────< (·) request_status_history
     id                    request_id   (FOREIGN KEY)
```

Una solicitud tiene **muchos** eventos de historia; cada evento pertenece a **exactamente
una** solicitud. La `FOREIGN KEY` es el pegamento y el guardián: impide insertar un evento
que apunte a una solicitud inexistente (por ejemplo `request_id = 999`), moviendo una
invariante de referencias del código a la base.

## Reglas protegidas por la base

- `id` **siempre generado por la base** (`GENERATED ALWAYS AS IDENTITY`): rechaza incluso un id
  enviado explícitamente por nuestro propio código. Traduce "el id nunca se repite y no lo
  elige el cliente".
- `title NOT NULL`: traduce "nunca existirá una solicitud sin título" (capa de integridad).
- `priority CHECK`: traduce "nunca existirá una prioridad fuera de `{low, medium, high}`".
- `status` y `new_status`/`previous_status` **CHECK**: traducen "la lista de estados es
  cerrada" — ni un acceso manual por SQL Editor puede escribir un estado inventado.
- `request_id FOREIGN KEY`: traduce "nunca habrá historia huérfana".
- `created_at`/`updated_at`/`changed_at` **NOT NULL + DEFAULT**: traducen "toda solicitud y
  todo evento tienen marcas de tiempo absolutas (con zona)".
- `id` `PRIMARY KEY` en ambas tablas: unicidad estructural.

## Reglas que sigue protegiendo la aplicación

- **Las transiciones** (`open → in_progress`, etc.): un `CHECK` ve el valor nuevo pero **no
  puede compararlo contra el valor anterior** de la fila. La máquina de estados sigue viviendo
  en `request-status.js`.
- **Los estados terminales** (`closed`, `cancelled`): misma razón — la base no sabe que "desde
  este estado no se sale".
- **Estado inicial `open`**: la base podría con un `DEFAULT`, pero la decisión de "toda
  solicitud nace abierta" la garantiza la aplicación con intención.
- **`updated_at` se renueva en cada cambio**: la base podría con un trigger, pero el proyecto
  lo hace explícito en el `UPDATE`.
- **Validación amable del contrato** (400 con `code`): la base rechaza con error crudo; la
  aplicación responde el `400` entendible **antes** de llegar al `INSERT`.

> Esta división **no es universal**: hay equipos que mueven más reglas a triggers y
> constraints compuestas. La nuestra prioriza dejar el proceso visible en el código y usar la
> base como última muralla estructural.

## Dudas

- ¿Conviene indexar `status`? Con el filtro `?status=open` del tablero, **sí es un candidato**,
  pero con el volumen actual no es urgente y cada índice encarece las escrituras: queda
  documentado, no implementado.
- ¿`title VARCHAR(200)` o `TEXT`? El esquema del curso fija `VARCHAR(200)`. Es discutible;
  lo indefendible sería no haberlo pensado. Hoy no se valida longitud en la app, así que un
  título de 300 caracteres daría `500` (restricción inesperada) en vez de `400`. Queda como
  duda a resolver con quien pide.
- ¿Se debe conservar `description` como `NULL` o como string vacío? Se eligió `NULL` para
  distinguir "no se describió" de "se describió con nada"; hay que confirmarlo.
- ¿Qué pasa con la historia si algún día se permite borrar (no hoy: decisión 001 vigente)? La
  FK sin `ON DELETE CASCADE` bloquearía el borrado mientras exista historia.
