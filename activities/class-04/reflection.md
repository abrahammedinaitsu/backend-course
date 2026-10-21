# Reflection — Entrega 04

> Fase 6. Respuestas concretas y con evidencia: "porque lo programé" no es una respuesta.

1. **¿Qué cambió al sustituir el array?**
   El estado dejó de vivir en el proceso: ahora vive en PostgreSQL y **sobrevive al reinicio**.
   Consecuencias concretas: el store pasó a ser **asíncrono** (async/await, los handlers también),
   la identidad la genera la base (`GENERATED ALWAYS AS IDENTITY` en vez del contador en memoria
   que se reiniciaba), y aparecieron capas nuevas — `pool`, `transaction`, `service`, `mapper` y
   la tabla de historia. Evidencia: `POST` → `201` con `id:6`, reinicio de Express, `GET
   /requests/6` → `200` con los mismos datos.

2. **¿Qué parte del contrato HTTP permaneció igual?**
   Casi todo: los endpoints de la clase 3 (`GET /requests`, `GET /requests/:id`, `POST`,
   `PATCH`), los filtros `?status=`/`?priority=`, los códigos (`400`/`404`/`409`) y el formato de
   error `{ error: { code, message } }`. Cambió **por dentro** todo el almacenamiento y el
   contrato **no se movió**: esa independencia es la conclusión arquitectónica de la clase. Solo
   se **agregó** `GET /requests/:id/history`.

3. **¿Qué regla protege PostgreSQL?**
   La integridad **estructural**: `id` con `IDENTITY` (rechaza ids enviados), `title NOT NULL`,
   los `CHECK` de `priority`/`status`, la `FOREIGN KEY` de la historia, los `DEFAULT` y las
   fechas `TIMESTAMPTZ NOT NULL`. Evidencia: verifiqué las constraints en la base
   (`requests_status_check`, `request_status_history_request_fk`, etc.).

4. **¿Qué regla sigue protegiendo la aplicación?**
   Las reglas del **proceso**: las transiciones (`open → in_progress`, …) y los estados
   terminales. La razón es concreta: un `CHECK` ve el **valor nuevo** pero **no puede compararlo
   contra el valor anterior** de la fila, así que no puede saber si una transición está
   permitida. Esa regla sigue viviendo en `request-status.js`. Evidencia: `PATCH /requests/2`
   `open → closed` → `409 INVALID_STATUS_TRANSITION`, aunque ambos valores existen en la lista.

5. **¿Por qué utilizaste parámetros?**
   Para que los valores externos viajen **como datos** y nunca se interpreten como
   **instrucciones** (SQL injection). En mi store ningún valor del cliente aparece dentro del
   texto de la consulta: todos son `$1`, `$2`… Los identificadores (columnas) salen de una
   **allowlist del código**. Evidencia: el SQL de `query-matrix.md` y el store (`status = $1`).

6. **¿Por qué necesitas un pool?**
   Reutilizar conexiones ya abiertas. Crear una conexión por petición es caro y PostgreSQL limita
   cuántas admite a la vez; el pool administra préstamos (presta un cliente y lo recibe de
   vuelta). Es **único por proceso** y vive en un solo archivo (`pool.js`), importado donde haga
   falta.

7. **¿Por qué la transacción debe usar el mismo cliente?**
   Porque la transacción vive en **una sola conexión**. `pool.query()` puede tomar una conexión
   distinta en cada llamada: el `BEGIN` de una no cubriría las consultas de otra, y quedarían
   **fuera de la unidad sin ningún error visible**. Uso `pool.connect()` una vez y todas las
   consultas de la unidad viajan por ese cliente. El `release()` va en `finally`.

8. **¿Qué inconsistencia evita el rollback?**
   Un estado cambiado **sin su historia** (o al revés): el presente de `requests` y el pasado de
   `request_status_history` contarían historias distintas — una "mentira silenciosa".
   Evidencia: con el fallo inyectado, `PATCH /requests/3` respondió `500`, y la consulta mostró
   `status` original y `updated_at` **sin cambiar**: el `UPDATE` provisional se revirtió.

9. **¿Por qué una fila no es automáticamente la respuesta HTTP?**
   Porque tiene otra forma: la fila habla `snake_case` (`created_at`) y el contrato promete
   `camelCase` (`createdAt`). Devolverla directo rompería el contrato en silencio: cualquier
   cliente leyendo `createdAt` recibiría `undefined`. El **mapper** traduce en un solo lugar. Un
   caso real que encontré: `BIGINT` vuelve de `pg` como **string**, así que el mapper además
   coerciona el `id` a número para no romper el contrato.

10. **¿Qué limitación sigue teniendo la solución?**
    Dos. (a) La **concurrencia**: la transacción protege la atomicidad de *una* operación, no la
    coordinación entre *dos*; dos cambios simultáneos pueden pisarse sin que nadie reciba error.
    (b) El **versionado de migraciones** es disciplina manual (numerar y ejecutar en el SQL
    Editor): no hay control de cuáles ya se aplicaron. Ambas quedan nombradas, no resueltas.

11. **¿Qué sugerencia de IA rechazaste?**
    La más importante: usar `pool.query()` dentro de la unidad transaccional "para simplificar".
    Habría roto la atomicidad (pregunta 7). También rechacé `ON DELETE CASCADE` (el proyecto no
    borra: decisión 001), un ORM/`supabase-js` (excluidos) e índices "por si acaso". Está todo en
    `ai-usage.md`, sección *What I rejected or changed*.

12. **¿Cómo comprobaste que los datos sobreviven al reinicio?**
    Con la prueba reina: creé una solicitud (`201`, `id:6`), **detuve y volví a arrancar** el
    proceso de Express, y consulté el mismo id: `200` con los **mismos datos** (`title`,
    `status`, fechas). La historia de otra solicitud también seguía completa. La evidencia
    literal (antes / reinicio / después) está en `test-matrix.md`, sección *Persistencia tras
    reinicio*.
