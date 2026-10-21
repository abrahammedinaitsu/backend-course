# Transaction plan — el cambio de estado con historia

> Fase 1 · completado **antes** de escribir la transacción. Si una pregunta no tiene
> respuesta en papel, el código la va a improvisar.

1. **¿Qué operaciones forman la unidad?**
   Dos escrituras, para un cambio de estado:
   (a) `UPDATE requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
   (b) `INSERT INTO request_status_history (request_id, previous_status, new_status)`.
   Ambas son **un solo hecho**: "la solicitud cambió de estado *y* quedó registrado".

2. **¿Qué ocurre si falla la primera (el UPDATE)?**
   No hay nada escrito todavía. El catch hace `ROLLBACK` (no-op, no hay cambios
   provisionales) y **relanza** el error. La solicitud queda con su estado original y su
   historia intacta: la base no cambia.

3. **¿Qué ocurre si falla la segunda (el INSERT de historia)?**
   El `UPDATE` ya está **provisional**. Sin transacción, quedaría un estado cambiado **sin
   su historia** — una mentira silenciosa. Con la transacción, el catch hace `ROLLBACK`: el
   `UPDATE` se descarta, la solicitud vuelve a su estado anterior y la historia queda
   intacta. El error se relanza para que la ruta responda.

4. **¿Cuándo se ejecuta `COMMIT`?**
   Solo después de que **ambas** consultas terminaron sin error, dentro del `try`, con el
   mismo cliente. Ahí las dos escrituras se vuelven permanentes **a la vez**.

5. **¿Cuándo se ejecuta `ROLLBACK`?**
   En el bloque `catch`, si cualquier paso entre `BEGIN` y `COMMIT` lanza. Después de
   revertir, se **relanza** el error: revertir no es ocultar.

6. **¿Qué cliente ejecuta las consultas?** _(¿por qué no `pool.query()`?)_
   Un **único cliente** obtenido con `pool.connect()`. Todas las consultas de la unidad usan
   ese cliente. **No se usa `pool.query()`** porque cada llamada a `pool.query()` **puede
   tomar otra conexión del pool**: el `BEGIN` abierto en una conexión no cubriría las demás
   consultas, y quedarían **fuera de la transacción sin ningún error visible** — el error más
   peligroso del tema.

7. **¿Cuándo se libera el cliente?** _(¿y si hubo error?)_
   En el bloque **`finally`**, con `client.release()`, **pase lo que pase** (éxito, rollback o
   excepción). Ponerlo dentro del `try` haría que, ante un error, el cliente **se fugue** y no
   vuelva al pool; repetido, el pool se agota y **toda la API deja de responder**. `release()`
   devuelve el préstamo; no cierra la base.

8. **¿Qué inconsistencia concreta evita esta unidad?** _(descríbela con las dos tablas)_
   Evita que `requests` quede con un `status` nuevo mientras `request_status_history` no tiene
   el evento correspondiente (o al revés). Es decir: **una solicitud cuyo presente y cuyo
   pasado no cuentan la misma historia**. Un auditor que pregunte "¿cuándo pasó a
   `in_progress`?" no encontraría respuesta, y el estado actual sería indemostrable.

## La creación también es una unidad

_(¿Qué dos escrituras ocurren al crear una solicitud? ¿Por qué también van juntas?)_
Al crear ocurren **dos** escrituras: (a) `INSERT INTO requests (…) RETURNING …`, y (b)
`INSERT INTO request_status_history (request_id, previous_status, new_status) VALUES ($1, NULL, 'open')`,
que registra el **nacimiento** (`NULL → open`).

Van juntas por la misma razón que el cambio de estado: una solicitud **no debe existir sin el
registro de su nacimiento**. Si la segunda falla, la primera debe revertirse; si no, quedaría
una solicitud con el historial "vacío" (imposible por diseño) o directamente sin su primer
evento. Por eso `create` también abre una unidad transaccional.
