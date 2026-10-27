# Recuperación · Logs y trazabilidad

## Logs duplicados

**Síntoma:** el mismo error aparece dos (o más) veces en el terminal por una sola petición.

**Qué significa aproximadamente:** dos piezas registran lo mismo: p. ej. el request logger Y el error handler registran el error completo, o quedó un `console.error` viejo en una ruta.

**Qué comprobar:** quién registra qué — el reparto de la clase: el request logger registra que la petición TERMINÓ (una línea por petición); el error handler registra el DETALLE interno de los errores inesperados (una línea por error).

**Acción sugerida:** busca `console.` fuera de `src/logging/` y decide para cada uno si pertenece al logger, al handler o a la basura.

**Qué no hacer:** borrar todos los logs hasta que quede uno (puedes borrar el importante).

**Pregunta para comprender:** si una petición falla, ¿cuántas líneas esperas en el log y qué cuenta cada una?

## Request ID diferente en body y log

**Síntoma:** el `requestId` del body de error no coincide con el de la línea de log (o con el header).

**Qué significa aproximadamente:** alguien genera el id más de una vez: el middleware corre dos veces, o el handler genera uno propio en vez de leer `req.requestId`.

**Qué comprobar:** que el id se genera en UN solo lugar (el middleware) y todos los demás lo LEEN; que el middleware está registrado una sola vez.

**Acción sugerida:** haz una petición con `X-Request-Id: mi-rastro-1` válido y verifica que ese MISMO valor aparece en header, body de error y log.

**Qué no hacer:** generar el id "donde haga falta" con randomUUID en varios archivos.

**Pregunta para comprender:** ¿por qué el identificador debe permanecer igual durante toda la petición pero cambiar entre peticiones?

## JSON de log inválido

**Síntoma:** al analizar tus logs (o en la prueba de trazabilidad), `JSON.parse` falla en alguna línea.

**Qué significa aproximadamente:** alguna línea no la produjo tu logger: es un `console.log` suelto, un objeto impreso con formato de Node, o dos líneas mezcladas.

**Qué comprobar:** que todo pasa por `logger.info` / `logger.error`; que nadie hace `console.log('algo', objeto)` con múltiples argumentos.

**Acción sugerida:** captura unas líneas reales y pásalas por `JSON.parse` una a una; la que falle te dice quién la escribió.

**Qué no hacer:** ajustar la prueba para ignorar líneas inválidas.

**Pregunta para comprender:** ¿qué gana una máquina —y qué pierde un humano— cuando el log es JSON por línea?
