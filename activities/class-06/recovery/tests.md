# Recuperación · Pruebas y aplicación

## Token inválido en pruebas manuales

Síntoma:
Tenías un token que funcionaba y ahora todo responde 401 INVALID_TOKEN.

Significado:
El token se firmó con un secreto o expiró; si cambiaste `JWT_SECRET` o
reiniciaste con otro `.env`, los tokens viejos ya no verifican.

Comprueba:
¿Cambiaste `.env` después de obtener el token? ¿Reiniciaste el server?

Acción:
Haz login de nuevo y usa el token fresco.

Qué NO hacer:
No toques el middleware para "aceptar" el token viejo.

Pregunta:
¿Por qué cambiar el secreto invalida TODOS los tokens emitidos?

## JWT_SECRET diferente entre procesos

Síntoma:
El login del test funciona pero /auth/me responde 401 dentro de la misma
corrida… o el server manual rechaza tokens del test.

Significado:
Dos procesos con `.env` distintos firman y verifican con claves distintas.

Comprueba:
¿Editaste `.env` con el server viejo aún corriendo?

Acción:
Un solo `.env`, reinicia todo lo que estaba corriendo.

Pregunta:
¿Quién debe compartir el secreto: los procesos o las personas?

## El test "no termina" (la terminal queda colgada)

Síntoma:
La suite pasa pero el proceso no devuelve el prompt.

Significado:
Una conexión quedó abierta — típicamente un pool sin cerrar.

Comprueba:
¿El archivo de test cierra el pool en su hook final (`after`)?

Acción:
Usa los helpers: `cleanupCreatedData()` y `closePool()` en `after(...)`.

Qué NO hacer:
No agregues `process.exit()` dentro de un test para "forzar" el final.

Pregunta:
¿Qué diferencia hay entre "terminaron mis pruebas" y "terminó mi proceso"?

## Cleanup fallido o peligroso

Síntoma:
Después de las pruebas faltan datos del seed, o sobran datos de prueba.

Significado:
Un cleanup demasiado amplio borró de más, o uno frágil corrió de menos.

Comprueba:
¿El cleanup borra por IDS REGISTRADOS o por una condición amplia?
¿Corre en `finally`/`after` aunque la prueba falle?

Acción:
Borra solo por ids recogidos, en orden history → requests → users.
Restaura el seed con `npm run db:seed` si algo del seed faltara.

Qué NO hacer:
`DELETE FROM requests;` sin WHERE. Nunca.

Pregunta:
¿Qué pasaría con el trabajo de tu compañero de equipo si tu cleanup
borrara "todo lo que parezca de prueba"?
