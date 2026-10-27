# Reflection — Entrega 03

> Fase 5. Respuestas concretas y con evidencia.

1. **¿Qué cambió entre los endpoints de la clase 2 y el sistema actual?**
   La clase 2 tenía tres endpoints sueltos sin reglas: crear, listar, consultar. Ahora hay
   cuatro (se sumó `PATCH`), pero el cambio de fondo es que existen **reglas**: identidad
   generada por el servidor, estado inicial `open`, ciclo de vida protegido, filtros y un
   formato de error uniforme `{ error: { code, message } }`. Además, la lógica vive en un
   módulo (`modules/requests/`) y no dispersa en un archivo.

2. **¿Qué regla fue más difícil de representar?**
   La distinción entre `resolved` y `closed`. No era un valor más de `status`: era reflejar que
   `resolved` es una afirmación del equipo (reabrible) y `closed` una confirmación final
   (terminal). Representarlo bien obligó a que el mapa distinguiera un retorno
   (`resolved → in_progress`) y dos terminales. Está en `request-status.js`.

3. **¿Qué diferencia encontraste entre validar datos y proteger una regla?**
   Validar datos mira **solo la petición** (¿llegó título?, ¿la prioridad es conocida?) y es
   decidible sin estado → `400`. Proteger una regla exige **consultar el estado actual**
   (`open` no puede pasar a `closed`) → `409`. La evidencia está en la matriz: `TITLE_REQUIRED`
   da `400` y `INVALID_STATUS_TRANSITION` da `409` aunque ambas sean "errores del cliente".

4. **¿Por qué decidimos no implementar `DELETE`?**
   Porque el requerimiento exige preservar la historia. Borrar destruiría la evidencia de qué
   se pidió y qué se decidió. Se cancela con `PATCH status:"cancelled"`, que deja la solicitud
   consultable. La decisión completa, con costos reconocidos, está en
   `activities/class-05/project/docs/decisions/001-cancel-instead-of-delete.md`.

5. **¿Qué limitación sigue teniendo el array?**
   Vive solo en memoria: al reiniciar el proceso se pierde todo (comportamiento esperado y
   documentado). Además, el contador `nextRequestId` vuelve a empezar, así que podría repetir
   ids que un cliente todavía recuerde; y el arreglo crece sin límite porque las canceladas se
   conservan.

6. **¿Qué parte se volvería problemática si agregamos otro recurso?**
   Hoy el store y la máquina de estados son específicos de `requests`. Un segundo recurso
   obligaría a decidir si comparten `generateId()` o cada uno tiene su identidad, y a separar
   responsabilidades para no mezclar ambos ciclos de vida. No es un problema para un recurso,
   pero marca el límite del `modules/requests/` actual.

7. **¿Qué sugerencia de IA rechazaste?**
   Varias: añadir `DELETE`, meter una capa de servicio, usar una librería de validación y bajar
   la transición inválida a `400`. Esta última es la más importante: habría roto una decisión
   documentada en mi contrato. Están todas en `ai-usage.md`, sección *What I rejected or changed*.

8. **¿Qué evidencia demuestra que una transición inválida está protegida?**
   La salida literal de `curl` en `test-matrix.md`:
   `PATCH /requests/2` con `{"status":"closed"}` desde `in_progress` →
   `HTTP/1.1 409 Conflict` + `{"error":{"code":"INVALID_STATUS_TRANSITION","message":"Cannot change status from in_progress to closed"}}`.
   Y la solicitud terminal: `PATCH /requests/1` en estado `closed` con cualquier body →
   `409 REQUEST_IN_TERMINAL_STATUS`. No es "porque lo programé": es la respuesta observada del
   servidor.
