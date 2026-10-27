# Guía de recuperación — Clase 06

Cuando algo falle, NO borres nada y NO cambies código para ocultar el error.
Busca tu síntoma en estos archivos:

1. `environment.md` — .env, variables, secretos, puerto.
2. `database-connection.md` — contraseña, ENOTFOUND, timeout, IPv6, pooler.
3. `migrations.md` — relaciones inexistentes, migración a medias, FKs.
4. `seed.md` — seed incompleto, duplicados, qué borra y qué no.
5. `tests.md` — JWT_SECRET distinto, tests que no terminan, cleanup, residuos.

Formato de cada problema: Síntoma → Significado → Comprueba → Acción →
Qué NO hacer → Pregunta para comprender.
