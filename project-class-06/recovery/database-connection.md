# Recuperación · Conexión a la base

## Contraseña incorrecta

Síntoma:
`password authentication failed` (código 28P01).

Significado:
Llegamos al servidor, pero rechazó las credenciales: el problema es la URL,
no tu red ni tu código.

Comprueba:
¿Copiaste la cadena COMPLETA del diálogo Connect? ¿La contraseña es la del
proyecto (no la de tu cuenta de Supabase)?

Acción:
Vuelve al diálogo Connect, copia la cadena de nuevo. Si olvidaste la
contraseña del proyecto, restablécela en Settings → Database.

Qué NO hacer:
No "pruebes" contraseñas al azar; no pegues la URL real en un chat de IA.

Pregunta:
¿Cómo demuestra este error que la red SÍ funciona?

## Caracteres especiales en la contraseña

Síntoma:
La contraseña es correcta pero la conexión falla o la URL "se corta".

Significado:
Dentro de una URL, caracteres como `@ : / # ? &` tienen significado propio;
si tu contraseña los contiene, deben ir codificados.

Acción:
La opción simple del taller: restablece la contraseña y elige una sin
caracteres reservados. (La alternativa técnica es codificarlos: `@` → `%40`.)

Qué NO hacer:
No entres al agujero del URL-encoding a mitad del taller.

Pregunta:
¿Qué papel juega el carácter `@` dentro de una cadena de conexión?

## ENOTFOUND

Síntoma:
`getaddrinfo ENOTFOUND ...`

Significado:
El hostname no se pudo resolver: la URL está incompleta, escrita a mano,
o tu red no alcanza ese endpoint.

Comprueba:
¿Copiaste el host desde Connect o lo escribiste suponiendo la región?

Acción:
Copia la cadena de nuevo desde Connect. Si persiste, usa la cadena del
**Session pooler** que muestra el mismo diálogo.

Qué NO hacer:
Jamás escribas el hostname a mano.

Pregunta:
¿Qué diferencia hay entre "no existe ese nombre" y "no responde"?

## Timeout o fallo por IPv6

Síntoma:
`ETIMEDOUT`, `ECONNREFUSED`, o la conexión "se queda pensando".

Significado:
El host existe pero no responde desde tu red. La conexión directa de
Supabase usa IPv6; muchas redes estudiantiles solo tienen IPv4.

Acción:
Abre el diálogo Connect y usa la cadena del **Session pooler** (funciona
sobre IPv4). Actualiza `DATABASE_URL` y corre `npm run class-06:doctor`.

Qué NO hacer:
No cambies de red a ciegas ni desactives tu firewall.

Pregunta:
¿Por qué la MISMA cadena puede funcionar en tu casa y fallar en el aula?

## Proyecto de Supabase no disponible

Síntoma:
Timeouts constantes; el dashboard muestra el proyecto "Paused" o "Restoring".

Significado:
Los proyectos gratuitos se pausan por inactividad; mientras despiertan no
aceptan conexiones.

Acción:
Restáuralo desde el dashboard y espera a que quede "Active" (1–2 min).

Qué NO hacer:
No crees un segundo proyecto "porque el primero no sirve".

Pregunta:
¿Dónde vive realmente tu información mientras el proyecto está pausado?
