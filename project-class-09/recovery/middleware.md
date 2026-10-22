# Recuperación · Middleware y errores

## El error handler no se ejecuta

**Síntoma:** implementaste `errorHandler` pero las respuestas de error siguen siendo HTML de Express o el formato viejo.

**Qué significa aproximadamente:** Express no está entregando los errores a tu middleware: o no está registrado, o está en la posición equivocada, o no tiene los cuatro parámetros.

**Qué comprobar:**

* Que `app.use(errorHandler)` existe en `app.js` y va DESPUÉS de las rutas.
* Que la función declara exactamente `(error, req, res, next)` — cuatro parámetros: con tres, Express la trata como middleware normal.
* Que ninguna ruta sigue atrapando el error con su propio `try/catch` y respondiendo antes.

**Acción sugerida:** agrega un log temporal en la primera línea del handler y provoca un error conocido; si no aparece, el problema es de registro/orden, no del cuerpo.

**Qué no hacer:** duplicar la lógica de error dentro de cada ruta "por si acaso".

**Pregunta para comprender:** ¿por qué un middleware de errores solo puede ver los errores producidos ANTES de su posición?

## Respuesta colgada (la petición nunca termina)

**Síntoma:** curl o Supertest se quedan esperando; el test aborta por timeout.

**Qué significa aproximadamente:** algún camino del código no envía respuesta ni llama a `next()`: la petición entró y nadie la cerró.

**Qué comprobar:** ramas `if` sin `res.json(...)`; un `catch` que registra pero no responde; un middleware que olvida `next()`.

**Acción sugerida:** sigue la petición etapa por etapa (recorrido del fallo) y encuentra la última etapa que SÍ se ejecutó.

**Qué no hacer:** subir el timeout de la prueba para "resolverlo".

**Pregunta para comprender:** ¿qué debería ocurrir con una petición cuando el handler lanza un error a mitad de camino?

## `Cannot set headers after they are sent`

**Síntoma:** ese mensaje en el terminal, a veces con la app caída.

**Qué significa aproximadamente:** dos piezas intentaron responder la MISMA petición: por ejemplo una ruta respondió y después el error handler intentó responder otra vez.

**Qué comprobar:** rutas que responden Y llaman a `next(error)`; el error handler sin la guarda de `res.headersSent`.

**Acción sugerida:** en el error handler, primera línea: `if (res.headersSent) return next(error);` — y en las rutas, una petición se responde UNA vez.

**Qué no hacer:** envolver todo en más `try/catch` hasta que el mensaje desaparezca.

**Pregunta para comprender:** ¿por qué HTTP no permite cambiar los headers después de empezar a enviar el body?

## Error async que no llega al handler

**Síntoma:** un `throw` dentro de un handler async produce un 500 HTML de Express (o un crash), no tu respuesta JSON.

**Qué significa aproximadamente:** el error sí viajó, pero tu error handler no está donde debe, O el proyecto quedó a medias entre el patrón viejo (try/catch por ruta) y el nuevo (central).

**Qué comprobar:** en Express 5 los rechazos de promesas SÍ llegan solos al error middleware — comprueba con la documentación qué versión usa el proyecto (`npm ls express`); busca rutas que todavía atrapan y responden por su cuenta.

**Acción sugerida:** decide UN patrón (en esta clase: central) y elimina los try/catch por ruta al mismo tiempo que registras el handler.

**Qué no hacer:** mezclar ambos patrones "temporalmente".

**Pregunta para comprender:** ¿qué hace `next(error)` distinto de `next()`?
