# Data model — Request API v5

> Fase 1 · el núcleo de solicitudes se completó **antes de usar IA y antes de tocar código** (clase 04).
> La clase 05 añade identidad (tabla `users`) y trazabilidad (`created_by`, `changed_by`) con las
> migraciones 003–005. El esquema expresa decisiones sobre los datos, no solo su forma: cada NOT NULL,
> DEFAULT y CHECK debe poder defenderse.

## Tabla `users` (nueva en la clase 05 · migración 003)

| Columna | Tipo | ¿Nulo? | Default | Restricciones | ¿Quién lo genera? |
| ------- | ---- | ------ | ------- | ------------- | ----------------- |
| `id` | `UUID` | NO | `gen_random_uuid()` | `PRIMARY KEY` | PostgreSQL |
| `email` | `CITEXT`/`TEXT` | NO | — | `UNIQUE` | Cliente (validado y normalizado en app) |
| `password_hash` | `TEXT` | NO | — | `NOT NULL` | App (scrypt; **nunca** se guarda la contraseña) |
| `role` | `TEXT` | NO | `'requester'` | `CHECK (role IN ('requester','agent'))` | Base (allowlist del registro) / operación administrativa |
| `created_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | PostgreSQL |

_(¿Por qué `role` tiene CHECK y default?)_ El registro público **no** elige rol: la fila nace
`requester` por `DEFAULT`, y el `CHECK` cierra la lista a `{requester, agent}`. Elevar a `agent`
es una operación administrativa aparte (SQL directo), nunca un campo del cuerpo HTTP: el `CHECK` es
la última muralla si algún día un bug intentara inyectar un rol inventado.

## Tabla `requests`

| Columna | Tipo | ¿Nulo? | Default | Restricciones | ¿Quién lo genera? |
| ------- | ---- | ------ | ------- | ------------- | ----------------- |
| `id` | `BIGINT` | NO | `GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY` | PostgreSQL |
| `title` | `VARCHAR(200)` | NO | — | `NOT NULL` | Cliente (validado en app) |
| `description` | `TEXT` | SÍ | — | — | Cliente |
| `priority` | `VARCHAR(20)` | NO | `'medium'` | `CHECK (priority IN ('low','medium','high'))` | Cliente (agent) o default |
| `status` | `VARCHAR(30)` | NO | `'open'` | `CHECK (status IN ('open','in_progress','resolved','closed','cancelled'))` | App (nace `open`) |
| `created_by` | `UUID` | SÍ | — | `FOREIGN KEY → users(id)` | App (tomado del token verificado) |
| `created_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | PostgreSQL |
| `updated_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | App (se renueva en cada cambio) |

_(¿Por qué `created_by` admite NULL?)_ Es la columna que introduce la **propiedad** (migración 004).
Las filas heredadas de la clase 04 existían antes de que hubiera usuarios, así que no tienen dueño:
`NULL` es aquí un valor del dominio con significado documentado ("solicitud anterior a la identidad"),
no un descuido. Un requester **no ve** las que no son suyas; un agent sí ve todas, incluidas las
heredadas. `NULL` **nunca** se asigna por el cliente: sale del token (`sub`).

## Tabla `request_status_history`

| Columna | Tipo | ¿Nulo? | Default | Restricciones | Notas |
| ------- | ---- | ------ | ------- | ------------- | ----- |
| `id` | `BIGINT` | NO | `GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY` | PostgreSQL |
| `request_id` | `BIGINT` | NO | — | `FOREIGN KEY → requests(id)` | El evento pertenece a una solicitud |
| `previous_status` | `VARCHAR(30)` | SÍ | — | `CHECK (IS NULL OR IN (…5 estados))` | NULL = nacimiento (`NULL → open`) |
| `new_status` | `VARCHAR(30)` | NO | — | `CHECK (new_status IN (…5 estados))` | El estado al que se llegó |
| `changed_by` | `UUID` | SÍ | — | `FOREIGN KEY → users(id)` | App (actor del cambio, del token) — migración 005 |
| `changed_at` | `TIMESTAMPTZ` | NO | `CURRENT_TIMESTAMP` | `NOT NULL` | Cuándo ocurrió el hecho |

_(¿Por qué `changed_by` admite NULL?)_ Igual que `created_by`: los eventos de la clase 04 son
anteriores a la identidad y no tienen actor. Los eventos nuevos **siempre** llevan `changed_by`
tomado del token verificado — nunca del cuerpo de la petición. Es la pieza de **auditoría**:
permite responder "¿quién movió esto a `closed` y cuándo?".

_(¿Por qué `previous_status` admite NULL?)_ Porque **el nacimiento no viene de ningún estado
anterior**: una solicitud no existe en estado "antes"; la primera fila de historia registra
`NULL → open`. Aquí NULL no es descuido: es un valor del dominio con significado documentado
("no hubo estado previo"), y por eso lleva su propio `CHECK` que lo permite explícitamente
frente a un estado inventado.

## Relaciones

```
users (1) ────< (·) requests              (created_by → users.id)
users (1) ────< (·) request_status_history (changed_by → users.id)
requests (1) ────< (·) request_status_history
     id                    request_id   (FOREIGN KEY)
```

Una solicitud tiene **muchos** eventos de historia; cada evento pertenece a **exactamente
una** solicitud. La `FOREIGN KEY` es el pegamento y el guardián: impide insertar un evento
que apunte a una solicitud inexistente (por ejemplo `request_id = 999`), moviendo una
invariante de referencias del código a la base.

Además, la clase 05 añade dos aristas hacia `users`: **quién es dueño** de cada solicitud
(`created_by`) y **quién** provocó cada evento de historia (`changed_by`). Son la base de la
propiedad y de la auditoría, respectivamente.

## Reglas protegidas por la base

- `id` **siempre generado por la base** (`GENERATED ALWAYS AS IDENTITY`): rechaza incluso un id
  enviado explícitamente por nuestro propio código. Traduce "el id nunca se repite y no lo
  elige el cliente".
- `title NOT NULL`: traduce "nunca existirá una solicitud sin título" (capa de integridad).
- `priority CHECK`: traduce "nunca existirá una prioridad fuera de `{low, medium, high}`".
- `status` y `new_status`/`previous_status` **CHECK**: traducen "la lista de estados es
  cerrada" — ni un acceso manual por SQL Editor puede escribir un estado inventado.
- `request_id FOREIGN KEY`: traduce "nunca habrá historia huérfana".
- `created_by` / `changed_by` **FOREIGN KEY → users(id)**: traducen "nunca habrá propiedad ni
  auditoría apuntando a un usuario inexistente".
- `role CHECK ('requester','agent')` + `email UNIQUE`: traducen "el rol es una lista cerrada" y
  "un email identifica a una sola cuenta".
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
- **La propiedad y los permisos** (clase 05): la base guarda `created_by`/`changed_by` y cierra
  `role`, pero **no** decide quién puede editar qué. Esa política (rol + propiedad + estado) vive
  en `request.policy.js`, en funciones puras y testeables; la base solo aporta los datos fiables
  (el actor sale del token verificado, nunca del cuerpo).
- **El hash de la contraseña**: la base guarda `password_hash NOT NULL`, pero **cómo** se calcula
  (scrypt, salt por usuario, comparación en tiempo constante) es responsabilidad de `password.js`.
  La base no puede saber si un `TEXT` es "suficientemente bueno" como hash.

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
