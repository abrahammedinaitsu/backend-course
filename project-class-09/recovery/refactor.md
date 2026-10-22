# Recuperación · Refactor y fronteras

## La suite se puso roja después de un paso del refactor

**Síntoma:** antes del paso todo estaba verde; después, una o más pruebas fallan.

**Qué significa aproximadamente:** el "refactor" cambió comportamiento observable — o dejó una referencia rota (import olvidado, función movida sin actualizar quién la llama).

**Qué comprobar:** el diff EXACTO del paso (git diff); ¿cambió una ruta, un status, un body, un permiso? ¿el import apunta al archivo nuevo?

**Acción sugerida:** revierte el paso (git checkout -- archivo o git stash), vuelve a verde, y reintenta con un paso MÁS pequeño.

**Qué no hacer:** "arreglar" la prueba para que acepte el nuevo comportamiento; seguir refactorizando encima de rojo.

**Pregunta para comprender:** ¿qué observó la prueba que tú no observaste en el diff?

## La prueba de policy necesita levantar el servidor o la base

**Síntoma:** request-policy.test.js importa app o pool, o falla sin DATABASE_URL.

**Qué significa aproximadamente:** la regla todavía depende de infraestructura — o la prueba está probando MÁS que la regla.

**Qué comprobar:** los imports del archivo de prueba (solo node:test, assert y la policy) y los de request.policy.js (ninguno de Express/pg).

**Acción sugerida:** pasa objetos simples ({ actor, request }) construidos a mano; si la policy exige más, la separación quedó incompleta.

**Qué no hacer:** conectar la base "solo para esta prueba".

**Pregunta para comprender:** ¿qué ganamos cuando la matriz completa corre en milisegundos?

## El validador falla en "Routes contain no SQL" o "Service does not depend on Express"

**Síntoma:** checks 11 o 12 en FAIL con la lista de lo encontrado.

**Qué significa aproximadamente:** una responsabilidad sigue en el lugar equivocado: SQL en la route, o el service leyendo req/res.

**Qué comprobar:** busca en el archivo señalado: SELECT/INSERT/UPDATE/pool.query (route) o req./res./express (service).

**Acción sugerida:** mueve el SQL al store y la coordinación al service; la route queda en traducir HTTP y llamar.

**Qué no hacer:** renombrar variables para esquivar el check (el objetivo es la frontera, no el texto).

**Pregunta para comprender:** ¿por qué el check es de TEXTO y aun así te está diciendo algo real del diseño?

## La migración 005 falla en una base que ya corrió las anteriores

**Síntoma:** [FAILED] 005_add_request_assignment.sql con un error de columna o constraint.

**Qué significa aproximadamente:** la base no está donde la migración cree — p. ej. ya corriste una versión editada de 005, o tocaste el CHECK a mano.

**Qué comprobar:** SELECT name FROM schema_migrations; y en Supabase, si requests ya tiene assigned_to.

**Acción sugerida:** si editaste 005 después de aplicarla: nunca edites migraciones aplicadas — crea una 006 que corrija. Si la aplicaste a medias a mano, restaura el estado con una migración nueva.

**Qué no hacer:** editar migraciones 001-004; borrar filas de schema_migrations "para que vuelva a correr".

**Pregunta para comprender:** ¿qué pasaría con las bases de tus compañeros si 002 cambiara hoy?

## El claim "funciona" pero el historial no aparece (o al revés)

**Síntoma:** la solicitud queda in_progress sin evento request_claimed, o hay evento sin asignación.

**Qué significa aproximadamente:** las dos escrituras no comparten transacción: una se confirmó y la otra no.

**Qué comprobar:** que assignRequest e insertHistoryEvent reciben el MISMO client de withTransaction, no el pool.

**Acción sugerida:** mueve ambas dentro del mismo withTransaction (mira cómo lo hace patchRequest).

**Qué no hacer:** "compensar" borrando o insertando a mano el evento que faltó.

**Pregunta para comprender:** ¿qué vio la clase 4 sobre unidades de trabajo que aplica exactamente aquí?
