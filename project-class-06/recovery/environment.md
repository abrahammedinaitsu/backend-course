# Recuperación · Entorno y configuración

## No existe .env

Síntoma:
El doctor dice "There is no .env file yet" o la app pide DATABASE_URL.

Significado:
La configuración local no existe todavía; el ejemplo sí.

Comprueba:
`ls -a` (macOS/Linux) o `dir /a` (Windows) — ¿ves `.env.example` pero no `.env`?

Acción:
macOS/Linux: `cp .env.example .env` · Windows (cmd): `copy .env.example .env`
· PowerShell: `Copy-Item .env.example .env`. Luego llena los valores.

Qué NO hacer:
No renombres `.env.example`: debe seguir existiendo como plantilla versionada.

Pregunta:
¿Por qué `.env.example` sí puede vivir en Git y `.env` no?

## Falta una variable

Síntoma:
`DATABASE_URL is required.` o `JWT_SECRET is required.` al arrancar.

Significado:
El archivo existe pero esa línea está vacía o mal escrita.

Comprueba:
Abre `.env`: ¿la variable tiene valor? ¿el nombre coincide EXACTO con `.env.example`?

Acción:
`DATABASE_URL`: cópiala del diálogo Connect de Supabase.
`JWT_SECRET`: ejecútalo con `npm run generate:secret` y pega el resultado.

Qué NO hacer:
No inventes un secreto corto a mano; no compartas la URL con nadie (IA incluida).

Pregunta:
¿Qué puede hacer otra persona con tu cadena de conexión completa?

## Puerto ocupado

Síntoma:
`EADDRINUSE: address already in use :::3000`.

Significado:
Otro proceso (probablemente un `npm run dev` anterior) sigue usando el puerto.

Comprueba:
¿Tienes otra terminal con el servidor corriendo?

Acción:
Cierra el proceso anterior (Ctrl+C en su terminal) o cambia `PORT` en `.env`.

Qué NO hacer:
No abras cinco terminales con cinco servidores para "probar".

Pregunta:
¿Por qué dos procesos no pueden escuchar el mismo puerto?

## Compartí un secreto por accidente

Síntoma:
Pegaste tu `DATABASE_URL` o `JWT_SECRET` en un chat, issue o captura.

Significado:
Ese valor ya no es secreto, sin importar si borras el mensaje.

Acción:
Supabase → Settings → Database → restablece la contraseña; genera un
`JWT_SECRET` nuevo con `npm run generate:secret`; actualiza tu `.env`.

Qué NO hacer:
No asumas que "nadie lo vio". Rotar cuesta un minuto.

Pregunta:
¿Por qué borrar el mensaje no des-expone el secreto?
