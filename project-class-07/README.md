# Clase 07 — Cuando el backend falla

Es tu **segunda semana** como desarrollador backend junior. Completaste tu
primer ticket y ahora formas parte del equipo que mantiene la API de
solicitudes. Soporte reporta que algunos usuarios reciben errores al
consultar y modificar solicitudes; las respuestas no son claras y los logs
actuales no permiten relacionar una petición con el error producido.

Tu tarea: **investigar los incidentes, corregir los defectos y mejorar la
capacidad del backend para explicar qué está ocurriendo.** Puedes usar IA
durante todo el proceso. No puedes cambiar el contrato solo para silenciar
una prueba.

> Antes de corregir un problema debemos poder reproducirlo, observarlo,
> formular una hipótesis y comprobar la solución.

## Los tres incidentes

| Incidente | Reporte | Brief |
| --- | --- | --- |
| INC-701 | Algunos identificadores devuelven error interno | `incidents/INC-701-invalid-request-id.md` |
| INC-702 | Actualizar ciertas prioridades produce error interno | `incidents/INC-702-invalid-priority.md` |
| OPS-703 | Los errores no se pueden rastrear en los logs | `incidents/OPS-703-untraceable-errors.md` |

## Tablero del taller

* [x] **Baseline** — el sistema funciona antes de tocarlo
* [x] **Reproducción** — los tres incidentes reproducidos con evidencia
* [x] **Diagnóstico** — síntoma ≠ causa: hipótesis y comprobación
* [x] **INC-701** — id inválido responde 400, con prueba de regresión
* [x] **INC-702** — prioridad inválida responde 400, restricción intacta
* [x] **Error handler** — un solo lugar traduce errores a respuestas
* [x] **Request ID** — respuesta y log comparten identificador
* [x] **Logs** — una línea JSON por petición, sin datos sensibles
* [x] **Health/ready** — el proceso vive; la disponibilidad se comprueba
* [x] **Validación** — `npm run validate:class-07` en PASSED

## Mi guardia: resumen (clase 07)

- **INC-701** corregido: nuevo `src/modules/requests/request-id.js`
  (`parseRequestId`, expresión anclada `/^[0-9]+$/`) usado por las rutas
  `GET /:id`, `GET /:id/history` y `PATCH /:id`. Rechaza `not-a-number`,
  `1.5`, `0`, `-3` y `12abc`; el id bien formado inexistente sigue en `404`.
- **INC-702** corregido: `assertValidPriority` restaurado en el servicio y
  aplicado en `POST` y `PATCH` **antes** del SQL. La restricción CHECK de
  PostgreSQL se **conserva** (segunda defensa).
- **OPS-703** completo: `error-handler` central (Express 5 reenvía los
  errores; sin `try/catch` por ruta), `request-id` (header + body + log,
  allowlist de formato), `request-logger` (una línea JSON por petición con
  allowlist de campos), `not-found` (JSON, no HTML) y `/health` + `/ready`
  con check de base inyectable. Se eliminó `src/http/respond-error.js` para
  dejar **un solo** punto de traducción.
- **Verificación:** `incidents:reproduce` → **RESOLVED ×3** · `npm test` →
  **39/39** (los 17 stubs convertidos) · `validate:class-07` → **PASSED 12/12**
  (dos veces).
- **Evidencia:** `activities/class-07/incident-report.md` y
  `activities/class-07/validation-evidence.txt`.

### Base de datos

Reutiliza la base de la clase 06 (esquema `class06` del mismo Supabase), tal
como pide el taller: misma cadena, mismo secreto. `npm run db:migrate` sale en
`[SKIPPED]`. El doctor resuelve las tablas por el `search_path` de la conexión
(nombres sin calificar) en vez de `public.` fijo.

## Puesta en marcha (baseline)

Usa el **mismo proyecto de Supabase de la clase 06** — misma base, misma
cadena de conexión, mismo secreto. No crees nada nuevo.

```bash
git status                  # registra desde dónde partes
cp .env.example .env        # pega tu DATABASE_URL y JWT_SECRET de la clase 06
npm install
npm run class-07:doctor     # 7 comprobaciones -> Environment ready for incident response.
npm run db:migrate          # todas las migraciones deben decir SKIPPED
npm run db:seed             # reconstruye SOLO los datos del taller
npm test                    # verde: 20 pruebas pass, 17 todo (las escribirás tú)
```

Si el baseline no funciona, **detente**: todavía no sabes si un fallo
posterior pertenece al ticket o al ambiente. Consulta `recovery/`.

## Comandos del taller

| Comando | Qué hace |
| --- | --- |
| `npm run class-07:doctor` | Diagnóstico del entorno (7 checks, no destructivo) |
| `npm run incidents:reproduce` | Reproduce los 3 incidentes: expected vs actual |
| `npm run db:migrate` / `db:seed` | Esquema y datos del taller (repetibles) |
| `npm test` | Suite completa (`node:test` + Supertest) |
| `npm run dev` | Servidor con recarga; aquí verás los logs |
| `npm run validate:class-07` | Validador final (12 checks) |

## Credenciales del seed (datos de demostración)

| Usuario | Email | Password | Rol |
| --- | --- | --- | --- |
| Ana | `ana.requester.seed@example.test` | `ana clave del taller 06` | requester |
| Luis | `luis.requester.seed@example.test` | `luis clave del taller 06` | requester |
| María | `maria.agent.seed@example.test` | `maria clave del taller 06` | agent |

Son datos de taller, públicos a propósito. Tu `DATABASE_URL` y tu
`JWT_SECRET` sí son secretos reales: nunca los pegues en un chat, un
commit o una captura.

## Reglas para trabajar con IA

La IA **puede**: explicar errores, separar síntoma de hipótesis, seguir un
valor por el código, proponer hipótesis con su comprobación, sugerir
cambios pequeños que TÚ ejecutas y verificas.

La IA **no decide en silencio**: el contrato HTTP, qué error es público,
qué se registra en los logs, qué código se elimina, qué prueba se ignora,
si una restricción de base desaparece, ni si una expectativa se cambia
"para que dé verde".

> Una hipótesis no se convierte en causa porque una IA la escribió.
> Necesitamos una comprobación.

## Entrega

Completa `activities/class-07/incident-report.md` mientras trabajas (no al
final de memoria) y guarda la salida real del validador en
`activities/class-07/validation-evidence.txt`. Detalles y commits sugeridos
en `activities/class-07/README.md`. **Nunca incluyas `.env`.**
