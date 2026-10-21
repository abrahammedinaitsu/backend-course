# Reflexión — Clase 05

Respuestas con evidencia concreta, no «porque lo programé».

1. **¿Qué diferencia hay entre identidad, autenticación y autorización?**
   Son **preguntas distintas** con respuestas distintas. *Identidad*: ¿quién dices ser? (la fila
   en `users`). *Autenticación*: ¿puedes demostrarlo? (login + token **verificado** → `req.auth`).
   *Autorización*: ¿puedes hacer **esto**? (`request.policy.js`: rol + propiedad + estado).
   La secuencia importa: no hay autorización sin autenticación (¿permiso para quién?). Evidencia:
   dos usuarios con el **mismo** token válido obtienen respuestas distintas ante la misma
   operación (un requester recibe `403` al cambiar prioridad; un agent, `200`).

2. **¿Por qué `createdBy` y `changedBy` nunca llegan desde el body?**
   Porque son la **fuente de identidad**, y el cliente no es de fiar para decir quién es. Si
   `createdBy` viniera del body, cualquiera crearía solicitudes «a nombre de» otro; si
   `changedBy` viniera del body, el atacante firmaría el acto con otro nombre y la **auditoría**
   —para lo que sirve— quedaría inútil. Ambos salen de `req.auth.userId` (token verificado). Y
   enviarlos no se ignora en silencio: se rechaza (`400 SERVER_CONTROLLED_FIELD`). Evidencia:
   `POST /requests` con `createdBy` ajeno → `400`, y el historial muestra al actor real del token.

3. **¿Qué diferencia hay entre `401` y `403`? ¿Y por qué a veces `404`?**
   `401` = «**no sé quién eres**» (falta identidad o no verifica). `403` = «**sé quién eres; esto
   no**» (identificado, operación prohibida por la política). `404` aparece en un tercer caso:
   el recurso **no existe o no debes saber que existe**. Un `403` sobre lo ajeno **confirmaría
   su existencia** (enumeración gratis), así que el recurso ajeno responde el **mismo** `404` que
   un id inexistente. Distingo también `409` («existe, pero choca»): petición bien formada que
   choca con el estado actual. Evidencia: `PATCH` de prioridad por un requester → `403`;
   `GET` de la solicitud de otro → `404` idéntico al de `999999`.

4. **¿Por qué decodificar un JWT no permite confiar en él?**
   Porque el payload va **firmado, no cifrado**: cualquiera lo **lee** y cualquiera puede
   **reescribirlo**. Decodificar solo muestra lo que el token *dice*; **verificar** comprueba la
   firma con el secreto del servidor, el algoritmo, el emisor, la audiencia y la expiración. Un
   payload editado (`role: "agent"`) sin re-firmar es legible pero **no verifica**. Evidencia: el
   validador fabrica un token alterado, uno expirado y uno firmado con otra clave; los tres dan
   `401 INVALID_TOKEN`.

5. **¿Por qué el `agent` sigue sujeto a la máquina de estados?**
   Porque **el rol amplía permisos, no deroga las reglas del dominio**. Que un agent *pueda*
   cambiar el estado no significa que *cualquier* cambio sea válido: las transiciones de la
   clase 03 describen cómo fluye una solicitud, no quién la mueve. Si el rol pudiera saltarlas,
   la línea de tiempo se volvería ficción y `closed` dejaría de ser terminal. Evidencia:
   `PATCH open → closed` por un **agent** → `409 INVALID_STATUS_TRANSITION`; y over un `closed`
   → `409 REQUEST_IN_TERMINAL_STATUS`, para todos los roles.

6. **¿Qué intentó romper el validador y qué limitación conserva esta solución?**
   El validador (12 checks, corrido **dos veces seguidas**) intentó: escalar rol al registrar
   (`role`, `id`, `passwordHash`…), inyectar un `createdBy` ajeno, entrar sin token / con `Basic`
   / con `Bearer` vacío, usar un token alterado, expirado o firmado con otra clave, hacer **IDOR**
   (pedir el recurso ajeno) y el **historial** ajeno, mandar bodies mixtos, cambiar prioridad y
   estado desde un rol equivocado, saltar la máquina de estados, y leer datos sensibles en
   cualquier respuesta. Todo eso lo resiste: `12/12`.
   **Limitación que conservo:** no hay **revocación** de tokens — el logout es local (el JWT
   sigue válido hasta expirar) y no hay refresh tokens ni lista de revocación. También quedan
   fuera el **rate limiting**, el reset de password y el MFA. No es deuda vergonzosa: es el
   **mapa de fronteras** de la solución, y parte de Él lo dibuja la entrega 05B.
