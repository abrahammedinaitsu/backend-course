# AI usage — Clase 05

> Regla del taller: la IA **permanece apagada** hasta que el checkpoint `class-05-access-design`
> pase. El diseño es de quien estudia; la IA revisa después y **no** cambia en silencio la
> matriz, el contrato de auth ni los casos de amenaza.

## My design before AI

Antes del primer prompt, y commiteado con el tag `class-05-access-design`, ya estaban decididos:

- **`access-matrix.md`** — las 10 filas de operación completas, las tres celdas polémicas
  (agent no crea; ajeno → 404; contenido = propia **y** abierta), la tabla de campos controlados
  por el servidor con su respuesta exacta, y qué pasa con las solicitudes heredadas.
- **`auth-contract.md`** — las fichas de `POST /auth/register`, `POST /auth/login` y
  `GET /auth/me` con respuesta de éxito completa, todas las filas de error y la semántica
  (criterio, no ejemplos) de 401/403/404/409.
- **`threat-cases.md`** — 17 ataques numerados, cada uno con su resultado **exacto** (HTTP +
  `error.code`).

El checkpoint se confirmó corriendo `npm run validate:class-05 -- --stage access-design` → `3/3`.

## What I asked

1. Revisar mi matriz y mi política buscando celdas mal pensadas o reglas mal repartidas entre
   base, política y service.
2. Revisar que ningún valor del cliente se cuele en el SQL ni en las decisiones del servidor
   (mass assignment).
3. Revisar el middleware `authenticate` buscando formas de identidad no confiable (decode sin
   verify, esquemas raros, tokens vacíos).
4. Explicar los códigos de error de `pg` y de `jose` para clasificar bien las categorías.
5. Enumerar ataques que yo no hubiera listado.

> Nunca pegué la `DATABASE_URL`, el `JWT_SECRET` ni tokens reales en el chat. Trabajé con
> nombres de columna, firmas de función y códigos de error.

## What the AI proposed

- Que `pg` lanza `error.code === '23505'` en la violación de único → traducirlo al `409`
  genérico `ACCOUNT_CANNOT_BE_CREATED` capturándolo en el service.
- Que `jose` (`SignJWT`/`jwtVerify`) con `algorithms`, `issuer` y `audience` explícitos es la
  forma correcta de **verificar** de verdad, en vez de `decodeJwt`.
- Que la longitud de la password se mida por **puntos de código** (`[...password].length`) y no
  por `.length` de UTF-16, para no rechazar emojis válidos.
- Casos de amenaza extra: header `Basic`, `Bearer` vacío, y el body mixto con verificación de
  que el campo permitido **no** se aplicó.
- Recordatorio: comparar con `timingSafeEqual` (ya lo hace el helper `password.js` del curso).

## What I accepted

- **`23505` → `409 ACCOUNT_CANNOT_BE_CREATED` genérico.** Beneficio: el registro no confirma
  qué emails existen. Costo: una rama de captura de error que hay que mantener y que debe
  seguir siendo **genérica** (fácil de romper devolviendo el mensaje de pg). Verificado por el
  stage `register` (email duplicado → `409`).
- **Verificación estricta con `jose` y parámetros explícitos.** Beneficio: firma alterada,
  token expirado y firma con otra clave **fallan** (el validador los fabrica y los prueba).
  Costo: si el secreto del `.env` no es el mismo que emitió, todo da `401` — hay que reiniciar
  el server tras cambiarlo (lo dejé en el README).
- **Longitud por puntos de código.** Beneficio: acepta Unicode real. Costo: un detalle que hay
  que recordar al validar cualquier campo de texto.
- **Los casos `Basic` y `Bearer` vacío.** Confirmé que ambos dan `401 AUTHENTICATION_REQUIRED`.

## What I rejected

- **`decodeJwt` para leer el rol en el middleware.** Es exactamente el desastre que enseña el
  lab de la estación 4: decodificar deja **leer**, no **confiar**. Un payload alterado
  (`role: "agent"`) pasaría como identidad válida. Mantuve `jwtVerify` con verificación de
  firma, algoritmo, emisor, audiencia y expiración.
- **Un único `403` para todo lo «raro».** Cada situación tiene su código: falta de identidad
  (401), identidad sin permiso (403), recurso invisible (404) y conflicto de estado (409). Un
  solo código borraría la información que el frontend necesita para decirle al usuario qué
  pasó (esto vale el 15% de la entrega 05A).
- **Meter SQL dentro de la política.** Habría vuelto la autorización no testeable a mano y
  habría duplicado la fuente de verdad del estado. La política quedó pura.
- **Aceptar `createdBy`/`changedBy` del body «por comodidad del frontend».** Sería firmar el
  acto con otro nombre; y además el enunciado lo prohíbe explícitamente. Se rechazan con `400`.
- **Rellenar con un dueño inventado las solicitudes heredadas.** Inventaría una historia que la
  base no respalda; el diseño **convive** con ellas (solo el agent las ve).

## Security mistakes I detected

- **Mi primer borrador del `.env.example`** tenía una URL `postgresql://postgres.<ref>…` en un
  comentario *de ejemplo*. El stage `setup` la marcó (`✗ No committed secrets`): una cadena con
  esquema y host parecía real. La reemplacé por un placeholder `usuario : password @ host : 5432`
  sin esquema. Lección: incluso un **comentario** de ejemplo puede parecer un secreto commiteado.
- **El alcance de la colección**: era tentador traer todo y filtrar en JavaScript. Habría paseado
  filas ajenas por el proceso antes de descartarlas. Lo dejé **en el SQL** (`WHERE created_by = $n`).
- **La comparación con `null`**: `createdBy === actor.userId` con un dueño `null` da `false`
  (comparación estricta), que es justo lo que quiero para las heredadas. Lo verifiqué a propósito
  para no caer en `null == undefined`.

## How I verified the implementation

Corrí el validador por estación (todas verdes) y el **boss battle dos veces seguidas** →
`RESULT: 12/12 · CLASS 05 COMPLETED` en ambas (idempotencia y limpieza confirmadas). Además,
evidencia HTTP con `curl` real para los casos que el validador resume: escalamiento de rol,
`createdBy` fabricado, IDOR (mismo 404), body mixto (nada cambia), transición inválida de un
agent, y que el historial registra al actor. Todo está en `validation-evidence.md`.

## What I still do not understand

- La **revocación de tokens**: un logout es local y el JWT sigue siendo válido hasta expirar.
  Sé que existen refresh tokens y listas de revocación, pero no sabría implementar su costo
  (estado en el servidor) ni cuándo vale la pena.
- El **«tiempo constante» real** del login ante email inexistente: mi código responde genérico,
  pero no camino el `verifyPassword` cuando el email no existe, así que los tiempos **pueden**
  diferir. No domino cómo igualarlo sin volver el login costoso.
- La **rotación de claves de firma** (`kid`, múltiples secretos): entiendo que existe, no cómo
  convive con tokens ya emitidos.
