# Plantilla — course-progress-evidence-01-07.md

`npm run progress:checkpoint` genera este documento automáticamente. Esta
plantilla existe como referencia de su estructura (y como respaldo manual si
el script no pudiera correr en tu máquina).

## Metadata

* studentId: [tu identificador — sin datos personales extra]
* promptVersion: ITSU-CHECKPOINT-01-07-1.0
* rubricVersion: BACKEND-01-07-R1
* generatedAt: [fecha ISO]
* commit: [hash corto del commit evaluado]
* tagsEncontrados: [lista de tags]
* modeloUtilizado: [completa DESPUÉS de ejecutar el prompt]

## Evidencia por clase

Para cada clase (01 a 07):

* Lista de artefactos encontrados con su estado: `FOUND` / `NOT_FOUND`.
* Las salidas guardadas (p. ej. validation-evidence.txt) son texto: se marcan
  `NOT_VERIFIED` como ejecución.
* Solo lo que el script ejecuta ahora mismo (consultas a git) lleva `EXECUTED_NOW`.
* Extractos breves de archivos de reflexión, con secretos redactados.

## Estado previo a la clase 8

* Último commit completado antes del taller.
* Validadores disponibles de las clases 1 a 7.
* Carpetas de pruebas existentes.
* Tags o entregas anteriores encontradas.

## Cuestionario diagnóstico (7 respuestas, 3-6 líneas cada una)

1. Describe qué ocurre desde que una petición llega al backend hasta que sale una respuesta y explica por qué el servidor debe permanecer activo.
2. Elige un endpoint del proyecto y explica cómo método, ruta, body y status forman su contrato.
3. Explica, usando una solicitud del proyecto, la diferencia entre representación, dato inválido y transición incompatible con el estado actual.
4. Explica la diferencia entre migración, seed y transacción, e indica dónde aparece cada concepto en el proyecto.
5. Explica la diferencia entre autenticación y autorización y por qué un JWT decodificado todavía debe verificarse.
6. Elige una prueba del proyecto, identifica preparación, acción y comprobación, y explica qué regresión protege.
7. Describe un fallo investigado distinguiendo síntoma, hipótesis y causa; luego indica qué señal correspondería a health o readiness.

## Seguridad

El paquete NUNCA incluye: `.env`, tokens, passwords, connection strings,
JWT secrets, `node_modules`, logs con secretos, binarios ni datos personales
innecesarios. Si detectas uno al revisar, reemplázalo por `[REDACTED]`.
