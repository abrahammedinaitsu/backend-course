# Casos adversariales — Request API v5

Ocho o más ataques que la implementación **deberá resistir**. Formato de cada caso: qué envía el
atacante → respuesta exacta (código HTTP + `error.code`).

Ejemplo resuelto: → `GET /requests` sin header Authorization → `401 AUTHENTICATION_REQUIRED`.
El middleware corta antes de que el router se entere.

Pienso como quien **NO respeta mi frontend**: ocultar un botón no es autorización.

1. Registro con `role: "agent"` en el body → `POST /auth/register` → `400 SERVER_CONTROLLED_FIELD` (el rol no se elige; la base lo impone).
2. Registro con `id` inventado o `createdBy` ajeno en el body → `POST /auth/register` → `400 SERVER_CONTROLLED_FIELD` (los campos del servidor se rechazan explícitos).
3. Registro con un email que ya existe → `POST /auth/register` → `409 ACCOUNT_CANNOT_BE_CREATED` (genérico: no confirma que la cuenta exista).
4. Login con password incorrecta vs. email inexistente → `POST /auth/login` → `401 INVALID_CREDENTIALS` idéntico en ambos, byte a byte (sin censo de cuentas).
5. Token de acceso alterado (cambio `role` a `agent` en el payload sin releer la firma) → `GET /auth/me` → `401 INVALID_TOKEN` (decodificar no es verificar).
6. Token expirado o firmado con otra clave → `GET /auth/me` → `401 INVALID_TOKEN` (una misma respuesta, sin decir cuál control falló).
7. IDOR: Alice pide por URL el `id` de una solicitud de Bob → `GET /requests/:id` → `404 REQUEST_NOT_FOUND` (idéntico al de un id inexistente; no revela existencia).
8. La historia ajena también es privada → `GET /requests/:id/history` de otra persona → `404 REQUEST_NOT_FOUND`.
9. Requester intenta cambiar la prioridad de su propia solicitud → `PATCH /requests/:id` → `403 FORBIDDEN` (identificado, operación prohibida).
10. Requester intenta cambiar el estado de su propia solicitud → `PATCH /requests/:id` → `403 FORBIDDEN`.
11. Body mixto: título permitido + prioridad prohibida en el mismo `PATCH` → `403 FORBIDDEN` y **nada** cambia (autorización todo-o-nada, sin actualizaciones parciales sorpresa).
12. `createdBy` o `changedBy` fabricados en el body → `POST`/`PATCH /requests` → `400 SERVER_CONTROLLED_FIELD` (el dueño y el actor salen del token, no del body).
13. `status` en la creación (p. ej. `closed`) → `POST /requests` → `400 SERVER_CONTROLLED_FIELD` (una solicitud nace `open`).
14. Agent intenta saltar la máquina de estados: `open → closed` → `PATCH /requests/:id` → `409 INVALID_STATUS_TRANSITION` (el rol no deroga las reglas del dominio).
15. Modificar una solicitud en estado terminal → `PATCH /requests/:id` → `409 REQUEST_IN_TERMINAL_STATUS` (para todos los roles).
16. Header de esquema `Basic` con credenciales → `GET /auth/me` → `401 AUTHENTICATION_REQUIRED` (solo `Bearer` es identidad aquí).
17. Solicitud heredada (`created_by IS NULL`) vista por un requester → `GET /requests/:id` → `404 REQUEST_NOT_FOUND` (`NULL` nunca coincide con un `userId`).
