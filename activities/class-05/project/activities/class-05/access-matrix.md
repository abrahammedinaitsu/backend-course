# Matriz de acceso — Request API v5

Dos roles exactos: `requester` y `agent`. Sin `admin`.

Cada celda es una **decisión** que el código después solo obedece. La matriz del taller es
fija (lámina «Contrato fijo» del bloque 02) y el validador la defiende.

| Operación | Anónimo | Requester | Agent |
| --------- | ------- | --------- | ----- |
| `POST /auth/register` | No | No | No |
| `POST /auth/login` | No | No | No |
| `GET /auth/me` | No | Propia | Propia |
| `GET /requests` | No | Propias | Todas |
| `GET /requests/:id` | No | Propia | Todas |
| `GET /requests/:id/history` | No | Propia | Todas |
| `POST /requests` | No | No | No |
| Editar título/descripción | No | Propia y abierta | No |
| Cambiar prioridad | No | No | Todas |
| Cambiar estado | No | No | Todas |

> Nota sobre las celdas de `POST /auth/register` y `POST /auth/login`: ambas son **públicas**
> en el sentido de que **no requieren token** (un anónimo puede llamarlas). La palabra del
> vocabulario que queda mejor es `No` para «Requester»/`Agent` y `No` para «Anónimo»… pero eso
> sería incorrecto: un anónimo SÍ puede registrarse y loguearse. Uso aquí la convención de la
> plantilla: la celda responde «¿puede ESTE actor ejecutar ESTA operación?». Como `register` y
> `login` no dependen de una identidad previa, las marco `No` en Requester/Agent (no aportan
> nada nuevo) y en Anónimo lo preciso abajo para no mentir con una sola palabra.

### Aclaración honesta de las dos celdas públicas

`POST /auth/register` y `POST /auth/login` **no exigen token**. En la tabla las marqué con la
palabra disponible (`No`), pero el matiz real es: **cualquiera, incluido un anónimo, puede
llamarlas** — son justamente los endpoints que *crean* y *demuestran* identidad. Por eso
`GET /auth/me` (que sí exige token) es el primero de la columna «Requester» como `Propia`
(devuelve tu propio usuario) y en «Agent», `Propia` (también el suyo): ninguno puede pedir «mi
usuario» por otro.

### Las tres celdas que generan debate

- **`POST /requests` es `No` para el agent.** Quien atiende no genera demanda con su propia
  cuenta: mezcla roles, ensucia métricas y complica la auditoría (¿atendió su propia solicitud?).
  Si un día los agent necesitaran reportar problemas, la decisión limpia sería **otra cuenta
  requester**, no un permiso doble.
- **El recurso ajeno responde como inexistente.** Un `403` **confirma existencia**; un `404`
  idéntico al de un id que no existe no regala nada. Es una decisión (documentada), no una ley:
  en dominios donde el recurso es público de leer pero privado de tocar, `403` sería lo honesto.
- **Editar contenido = `Propia y abierta`.** Dos condiciones de naturaleza distinta: propiedad
  (¿es tuya?) **y** estado (¿sigue abierta?). En cuanto un agent trabaja la solicitud, cambiar
  el enunciado por debajo rompería la trazabilidad de lo que el agent aceptó atender.

## Campos controlados por el servidor

El cliente JAMÁS puede enviar estos campos; intentarlo produce un rechazo **explícito** (nunca
un ignorado silencioso, que enseñaría que intentar es gratis):

| Dónde | Campos prohibidos | Respuesta exacta |
| ----- | ----------------- | ---------------- |
| `POST /auth/register` | `role`, `id`, `createdAt`, `updatedAt`, `createdBy`, `passwordHash` | `400 SERVER_CONTROLLED_FIELD` |
| `POST /requests` | `id`, `createdBy`, `createdAt`, `updatedAt`, `changedBy`, y `status` | `400 SERVER_CONTROLLED_FIELD` |
| `PATCH /requests/:id` | `id`, `createdBy`, `createdAt`, `updatedAt`, `changedBy` | `400 SERVER_CONTROLLED_FIELD` |

`createdBy` (dueño) y `changedBy` (actor de la transición) salen **siempre** del token
verificado (`req.auth`), nunca del cuerpo. `status` es del servidor **en la creación** (una
solicitud nace `open`); en el `PATCH` sí es modificable, pero solo por el agent.

## Solicitudes heredadas

**¿Quién ve las solicitudes sin propietario (`created_by IS NULL`)?** Solo los **agents**.

Razón: `NULL` no significa «de todos», significa «de nadie» — son las solicitudes creadas en
las clases 03 y 04, antes de que existiera la tabla `users`. Y lo que no es de nadie lo
gestiona quien gestiona todo: el agent. Para un requester, una fila con `created_by IS NULL`
**nunca** coincide con su `userId` (comparación estricta), así que responde el mismo `404` que
una que no existe. La migración 004 dejó la columna *nullable* a propósito por compatibilidad,
no por descuido: una migración futura podría rellenar dueños y luego pasar a `NOT NULL`.
