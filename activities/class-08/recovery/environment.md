# Recuperación · Entorno

## Supabase inaccesible

**Síntoma:** el doctor falla en "Database connection established"; el terminal muestra `ETIMEDOUT`, `ECONNREFUSED` o `ENOTFOUND`.

**Qué significa aproximadamente:** el proceso no logra hablar con tu base. Casi nunca es tu código: es la red, la cadena de conexión o el proyecto pausado.

**Qué comprobar:**

* El estado del proyecto en el dashboard de Supabase (los proyectos gratuitos se pausan tras días de inactividad).
* Que `DATABASE_URL` fue copiada del diálogo Connect, no tecleada.
* Si tu red es solo IPv4, que estás usando la cadena del Session pooler.

**Acción sugerida:** restaura el proyecto si está pausado, espera a que diga Active y vuelve a ejecutar `npm run class-07:doctor`.

**Qué no hacer:** crear un proyecto nuevo (perderías tus datos de la clase 06); pegar tu cadena completa en un chat para pedir ayuda.

**Pregunta para comprender:** ¿este fallo es un error esperado o inesperado para TU backend? ¿Qué código debería responder tu API mientras tanto?

## `.env` faltante o incompleto

**Síntoma:** el doctor falla en "Environment configured", o la app lanza `DATABASE_URL is required.`

**Qué significa aproximadamente:** el proceso arrancó sin su configuración local. `.env` no se versiona: cada clon lo recrea.

**Qué comprobar:** que `.env` existe junto a `package.json` y que `DATABASE_URL` y `JWT_SECRET` tienen valor.

**Acción sugerida:** `cp .env.example .env`, pega la cadena de la clase 06 y, si perdiste el secreto, `npm run generate:secret`.

**Qué no hacer:** versionar `.env` para "no volver a perderlo"; inventar un secreto corto a mano.

**Pregunta para comprender:** ¿por qué el repositorio incluye `.env.example` pero excluye `.env`?

## Seed incompleto

**Síntoma:** el doctor falla en "Seed data available", o `incidents:reproduce` dice que no encuentra usuarios o solicitudes del seed.

**Qué significa aproximadamente:** faltan los datos identificables del taller (usuarios `*.seed@example.test` y sus solicitudes).

**Qué comprobar:** la salida de `npm run db:seed` — debe terminar con "Seed completed successfully."

**Acción sugerida:** `npm run db:seed`. Es repetible: reconstruye SOLO los datos del taller y conserva lo demás.

**Qué no hacer:** insertar filas a mano en la tabla; borrar tablas completas para "empezar limpio".

**Pregunta para comprender:** ¿qué distingue a los datos que el seed puede tocar de los que no?

## Puerto ocupado

**Síntoma:** `npm run dev` termina con `EADDRINUSE: address already in use`.

**Qué significa aproximadamente:** otro proceso (probablemente un servidor tuyo anterior) sigue escuchando en ese puerto.

**Qué comprobar:** terminales abiertas con un `npm run dev` olvidado.

**Acción sugerida:** cierra el proceso anterior (Ctrl+C en su terminal) o cambia `PORT` en `.env` y reinicia.

**Qué no hacer:** matar procesos del sistema que no reconoces.

**Pregunta para comprender:** ¿por qué dos procesos no pueden escuchar el mismo puerto?

## JWT inválido

**Síntoma:** todos los logins devuelven token, pero TODA petición autenticada responde `401 INVALID_TOKEN`.

**Qué significa aproximadamente:** el secreto con el que se firmó el token no es el mismo con el que se verifica — normalmente cambiaste `JWT_SECRET` con el servidor corriendo o entre login y petición.

**Qué comprobar:** que no editaste `.env` después de obtener el token; que solo hay UN valor de `JWT_SECRET`.

**Acción sugerida:** reinicia el servidor y vuelve a hacer login para obtener un token firmado con el secreto actual.

**Qué no hacer:** copiar un token viejo de otra sesión; comentar la verificación "mientras tanto".

**Pregunta para comprender:** ¿por qué cambiar el secreto invalida todos los tokens emitidos?
