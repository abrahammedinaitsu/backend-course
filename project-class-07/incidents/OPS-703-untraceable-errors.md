# OPS-703 — Errores imposibles de rastrear

**Tipo:** mejora operativa pedida por soporte · **Prioridad:** media · **Estado inicial:** reported

## Reporte de soporte (literal)

> "Cuando un usuario nos reenvía un error, no podemos encontrar qué pasó.
> Los mensajes del terminal no se pueden relacionar con ninguna petición
> concreta, y si cinco usuarios reciben un 500 al mismo tiempo no sabemos
> cuál línea corresponde a cada uno."

Este no es un bug puntual: es una **carencia del sistema**. Hoy el backend
no puede explicar qué ocurrió cuando algo falla.

## Qué se pide

1. **Request ID**: cada petición recibe un identificador único que
   * viaja en la respuesta como header `X-Request-Id`;
   * aparece dentro del body de todo error como `requestId`;
   * aparece en cada línea de log de esa petición.
2. **Logs estructurados**: una línea JSON por petición terminada, con
   `timestamp`, `level`, `event`, `requestId`, `method`, `path`, `status`
   y `durationMs`. Nada de `console.log` sueltos sin contexto.
3. **Manejo centralizado**: un único middleware de errores produce TODAS
   las respuestas de error, con el mismo formato, y registra el detalle
   interno de los errores inesperados (mensaje y stack van al log,
   **nunca** a la respuesta).
4. **Endpoints operativos**: `GET /health` (el proceso vive; sin consultar
   PostgreSQL) y `GET /ready` (¿puede atender tráfico? comprueba la base
   y responde `503` si no está disponible).

## Reglas

* El request ID identifica la **petición**, no al usuario. No es un secreto,
  pero jamás se usa el JWT como identificador.
* Un `X-Request-Id` enviado por el cliente solo se acepta si tiene un
  formato razonable (alfanumérico, punto, guion, guion bajo, máx. 64
  caracteres); cualquier otra cosa se reemplaza.
* En los logs **nunca** aparecen: `Authorization`, tokens, passwords,
  hashes, emails completos por defecto, `DATABASE_URL`, ni el body.
* `/ready` no revela host, puerto, usuario ni SQL.

## Definición de terminado

* [ ] Toda respuesta lleva `X-Request-Id`; todo error lleva `requestId` en el body.
* [ ] La línea de log de una petición se encuentra buscando el mismo requestId.
* [ ] Los errores inesperados responden un 500 genérico y dejan el detalle en el log.
* [ ] `GET /health` responde 200 aunque la base esté caída.
* [ ] `GET /ready` responde 200 con base disponible y 503 sin ella.
* [ ] Las pruebas de trazabilidad y de health/readiness están en verde.
