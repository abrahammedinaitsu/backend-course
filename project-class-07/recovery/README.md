# Guía de recuperación — Clase 07

Cuando algo se rompa, no cambies código al azar: busca tu síntoma aquí.
Cada entrada tiene el mismo formato: qué significa, qué comprobar, qué
hacer, qué NO hacer y una pregunta para comprender.

| Si el problema es de… | Abre |
| --- | --- |
| Entorno: Supabase, .env, seed, puerto, JWT | `environment.md` |
| Middleware: error handler, respuestas colgadas, headers | `middleware.md` |
| Logs: duplicados, request ID, JSON inválido | `logs.md` |
| Pruebas: no terminan, pool, dependencias, datos sin limpiar | `tests.md` |

Regla general: **reproduce antes de corregir**, y ejecuta
`npm run class-07:doctor` antes de culpar a tu código.
