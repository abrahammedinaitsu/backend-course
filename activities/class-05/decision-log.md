# Registro de decisiones — Clase 05

Una entrada por decisión no obvia: qué decidí, qué alternativas había y por qué.

## 001 — Dónde vive la identidad del actor

**Decisión:** la única fuente de identidad es `req.auth = { userId, role }`, construida en el
middleware `authenticate` a partir del payload **verificado** del JWT. El servicio recibe
`actor` como primer argumento y de ahí sale todo lo que el servidor decide (`createdBy`,
`changedBy`, el alcance de la colección).

**Alternativas:** (a) leer `createdBy`/`role` del body; (b) volver a consultar la base en cada
handler para averiguar el rol.

**Por qué:** (a) sería *mass assignment*: el cliente elegiría de quién es la solicitud y su
propio rol — justo el ataque nº1 del validador. (b) duplicaría una consulta por petición y, peor,
crearía una segunda fuente de verdad sobre el rol. El token verificado ya trae lo mínimo
(`sub`, `role`); cuando hace falta el usuario completo (p. ej. `/auth/me`), se consulta **una**
vez. La regla queda explícita en `SERVER_CONTROLLED_FIELD`: esos campos en el body **se rechazan**,
no se ignoran.

## 002 — Por qué el recurso ajeno responde 404 y no 403

**Decisión:** quien no puede **ver** una solicitud recibe el **mismo** `404 REQUEST_NOT_FOUND`
que un id inexistente, en `GET /requests/:id` y en `GET /requests/:id/history`.

**Alternativas:** `403 FORBIDDEN` (identificado pero sin permiso) para el recurso ajeno.

**Por qué:** un `403` **confirma que el recurso existe**. Eso es enumeración gratis: un atacante
distingue «no existe» de «existe pero no es tuyo» y puede mapear la base id por id. El `404`
idéntico no regala nada. Es una **decisión de diseño**, no una ley: en dominios donde el recurso
es público de leer pero privado de tocar, `403` sería más honesto — y lo dejaré escrito aquí
para poder defender el matiz. La distinción operativa: **primero visibilidad (404), después
permiso (403)**. Si no debes saber que existe, no hay conversación sobre permisos; si ya lo ves
(y la operación está prohibida), ahí sí es `403`.

## 003 — Qué pasa con las solicitudes heredadas (`created_by IS NULL`)

**Decisión:** las solicitudes sin dueño son **solo de los agents**. Un requester **nunca** las ve
(mismo `404`). La migración 004 dejó `created_by` *nullable* a propósito.

**Alternativas:** (a) rellenar un dueño con una migración de datos; (b) tratarlas como «de
todos»; (c) volverlas invisibles para todos.

**Por qué:** `NULL` no significa «de todos», significa «de nadie» — son las filas creadas en las
clases 03 y 04, antes de que existiera `users`. (a) inventaría un dueño que la historia no
respalda; (b) haría que **cualquiera** las viera y pudiera tocarlas, que es lo contrario de
«propiedad»; (c) las perdería, y el diseño debe **convivir** con los datos previos, no borrarlos
(la decisión 001 de la clase 04 sigue vigente: no se borra). La regla «lo que no es de nadie lo
gestiona quien gestiona todo» las entrega al agent. La columna `nullable` es una decisión
consciente de migración: una migración futura podría rellenar dueños y luego pasar a `NOT NULL`.

## 004 — La autorización se aplica dentro de la transacción, con la fila delante

**Decisión:** en `PATCH`, leo la fila actual (`findById` con el cliente de la transacción),
**autorizo contra esa fila** y recién entonces escribo. Y la autorización es **todo-o-nada**: si
el body mezcla un campo permitido con uno prohibido, se rechaza **entero** (`403`) y no se aplica
nada.

**Alternativas:** autorizar antes de leer (contra qué estado?) o campo por campo (escribiendo
entre medio).

**Por qué:** `canEditContent` depende del **estado actual** (`open`) y de la **propiedad**: sin la
fila delante no puedo decidir. Y aplicar campo por campo produciría **actualizaciones parciales
sorpresa**: un body con `title` (permitido) y `priority` (prohibido) dejaría escrito el título
antes de fallar. El validador tiene un check exacto para esto (rechaza el mixto y luego confirma
que el título no cambió). La autorización va en una función **pura** (`request.policy.js`), sin
SQL ni HTTP, para que sea testeable a mano.

## 005 — La política es pura y el dominio no se negocia

**Decisión:** `request.policy.js` son funciones puras `(actor, [representación]) → boolean`. Y
las reglas de estado de la clase 03 (transiciones válidas, estados terminales) **siguen
aplicando a todos los roles**, incluido el agent.

**Alternativas:** poner la autorización dentro del service mezclada con SQL; o «ablandar» la
máquina de estados para el agent porque «es admin de facto».

**Por qué:** la pureza no es estética: es lo que hace la política testeable y reutilizable, y lo
que mantiene el SQL en el store. Y sobre la máquina de estados: **el rol amplía permisos, no
deroga las reglas del dominio**. Que un agent pueda cambiar el estado no significa que pueda
saltar de `open` a `closed`: la transición `open → closed` no existe para nadie (`409`). Un
`closed` sigue siendo terminal para todos.

## 006 — `changedBy` (auditoría) sale del token

**Decisión:** cada transición registra **quién** la produjo, en `request_status_history.changed_by`
(migración 005), tomado de `req.auth.userId`. El nacimiento de una solicitud registra al
**creador** como actor de ese primer evento.

**Alternativas:** dejar la auditoría implícita (deducirla del `createdBy`), o aceptar el actor
desde el body.

**Por qué:** sin auditoría (`changed_by`) sabrías que nadie hizo lo prohibido, pero **no quién
hizo lo permitido** — y eso es exactamente lo que pide la matriz («¿atendió su propia
solicitud?»). Aceptarlo del body lo volvería inútil: el atacante firmaría el acto con otro
nombre (`400 SERVER_CONTROLLED_FIELD`).
