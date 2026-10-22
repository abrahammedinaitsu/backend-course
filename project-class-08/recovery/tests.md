# Recuperación · Pruebas

## Un test que no termina

**Síntoma:** `npm test` se queda colgado al final, o un archivo de prueba nunca cierra.

**Qué significa aproximadamente:** algo mantiene vivo el proceso: casi siempre un pool de PostgreSQL sin cerrar o un servidor sin `close()`.

**Qué comprobar:** que el archivo de prueba cierra el pool en su `after()` (mira cómo lo hacen las suites existentes con `closePool()`).

**Acción sugerida:** añade el `after` que falta; cada archivo de prueba corre en su propio proceso, así que cada uno cierra lo suyo.

**Qué no hacer:** `process.exit()` dentro de la prueba; `--test-force-exit` para taparlo.

**Pregunta para comprender:** ¿por qué el proceso de Node no termina mientras el pool tenga conexiones abiertas?

## Pool sin cerrar / `Cannot use a pool after calling end`

**Síntoma:** el mensaje anterior, o pruebas que fallan solo cuando corren juntas.

**Qué significa aproximadamente:** dos piezas comparten el MISMO pool y una lo cerró antes de que la otra terminara.

**Qué comprobar:** que solo el `after()` final cierra el pool, una vez; que ningún helper lo cierra por su cuenta.

**Acción sugerida:** deja el cierre en un único lugar (el hook `after` del archivo).

**Qué no hacer:** crear un pool nuevo por prueba para esquivar el problema.

**Pregunta para comprender:** ¿por qué el proyecto tiene UN pool compartido en vez de una conexión por consulta?

## Una prueba depende de otra

**Síntoma:** una prueba pasa sola pero falla dentro de la suite (o al revés); el orden importa.

**Qué significa aproximadamente:** una prueba consume estado que otra creó (o destruyó): mismos emails, misma solicitud, mismo contador.

**Qué comprobar:** que cada prueba crea SUS datos con los helpers (emails únicos por corrida) y no reutiliza ids de otra.

**Acción sugerida:** reescribe la prueba dependiente para que prepare todo lo que necesita.

**Qué no hacer:** fijar el orden de las pruebas para que "siempre pase".

**Pregunta para comprender:** ¿qué hace que una prueba sea repetible en cualquier orden y máquina?

## Datos temporales sin limpiar

**Síntoma:** la base acumula usuarios `class07-test-...` o solicitudes de prueba tras corridas fallidas.

**Qué significa aproximadamente:** una corrida murió antes del cleanup, o una prueba creó datos fuera de los helpers (que registran cada id creado).

**Qué comprobar:** que toda creación pasa por los helpers; que el cleanup vive en `after()` (se ejecuta también cuando la prueba falla).

**Acción sugerida:** borra los restos identificables por su email/título de prueba — solo esos — y corrige la prueba que los dejó.

**Qué no hacer:** `DELETE FROM users;`, `TRUNCATE`, o borrar el seed para "limpiar".

**Pregunta para comprender:** ¿por qué el orden de borrado es historial → solicitudes → usuarios?
