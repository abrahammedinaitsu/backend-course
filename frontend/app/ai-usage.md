# AI usage — Entrega 05A

Uso de IA en la interfaz (`frontend/app/`). El taller permite IA para el frontend; lo que **no**
permite es cambiar el contrato, inventar endpoints, desactivar la autenticación, enviar
`createdBy`/`role`, simular el backend ni tratar ocultar botones como autorización.

## What I asked

1. Definir una arquitectura de módulos pequeños (api/errors/domain/session/ui) para no mezclar
   red, estado y pintado en un solo archivo.
2. Un clasificador de errores que mapee **cada** status del contrato a un mensaje distinto y
   accionable (el requisito de «estados distinguibles»).
3. Cómo mostrar al agent **solo** las transiciones disponibles desde el estado actual sin
   duplicar la máquina de estados del backend.
4. Confirmar que la UI nunca mande `createdBy`/`role`/`status` al crear.

## What the AI proposed

- Separar `errors.js` (puro, sin red) para poder **probar el clasificador** con casos sintéticos
  sin levantar el backend.
- Un «espejo» de autorización en el frontend (`domain.js`) usado **solo** para decidir qué
  mostrar, con un comentario explícito de que **no** es autorización real.
- Reutilizar la tabla de transiciones exacta (`open → in_progress → resolved → closed`, etc.) en
  vez de inventar una más permisiva.
- Construir DOM con `textContent` (nunca `innerHTML`) para que los datos de la API se escapen
  por construcción.

## What I accepted

- La separación modular (facilita explicar cada pieza en la defensa).
- El clasificador de errores con `kind` + `badge`: cumple «todos los estados, distinguibles».
- El espejo de autorización **con advertencia**: `canEditContent` = requester ∧ dueño ∧ abierta,
  idéntico a `canEditContent` del backend.
- El `<select>` de estado poblado **solo** con `availableTransitions(status)`.

## What I rejected

- **Guardar el token en `localStorage` «para que no se pierda al recargar».** Lo rechacé: es un
  riesgo de XSS a cambio de comodidad, y el starter lo advierte. Quedó en memoria y está
  documentado en el README.
- **Filtrar en el cliente** (traer todo y esconder lo ajeno). Habría paseado filas ajenas por el
  navegador y roto el aislamiento. El backend acota en SQL; el cliente solo pide.
- **Un mensaje único para todos los errores.** No cumple la rúbrica: `400`, `401`, `403`, `404`,
  `409`, `500`, `503` y «sin red» son situaciones distintas.
- **Ofrecer `closed` directamente desde `open`** en el `<select>` «porque es más corto». Sería
  mostrar una acción que el servidor rechaza con `409`; el select ofrece solo lo válido.

## Security mistakes I detected

- Un primer borrador mandaba `status` en el body de creación (la solicitud nace `open`; mandarlo
  da `400 SERVER_CONTROLLED_FIELD`). Se eliminó.
- Otro borrador hacía `innerHTML` con el título de la solicitud: XSS almacenado si un título traía
  `<script>`. Se cambió a `textContent`.
- Me aseguré de que el formulario de registro **no** tuviera campo de rol (el rol lo impone la base).

## How I verified

- El clasificador, con 11 casos sintéticos (uno por status): cada uno devuelve un `kind` y un
  mensaje propios.
- El flujo completo en el navegador contra la API real: registro → login → crear → listar →
  detalle → historial → editar → logout → login agent → cambio de estado (historial con actor).
- Casos adversariales desde el navegador (mismo origen/CORS real): IDOR → `404`, prioridad por
  requester → `403`, body mixto → `403` sin cambios, id inexistente → `404`.
- `npm run build` sin errores.

## What I still do not understand

- Cómo evitar que el espejo de autorización (`domain.js`) se **desincronice** del backend con el
  tiempo. Hoy son dos lugares con la misma regla; sé que eso es deuda técnica, pero no domino un
  patrón limpio para compartir la política entre back y front sin exponer el backend.
- El manejo de expiración «silenciosa» del token durante una sesión larga (refresh en segundo
  plano) sin interrumpir al usuario.
