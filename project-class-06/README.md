# Request API — Clase 06 · Tu primer ticket en un backend existente

> Es tu primera semana como desarrollador backend junior. Te asignaron este
> repositorio: administra solicitudes, usuarios, autenticación, permisos e
> historial. Recibiste el código, migraciones, un seeder, algunas pruebas y
> dos tickets. NO recibiste una base de datos configurada: esa parte es tuya.
>
> Puedes usar IA durante todo el proceso. Al terminar, demostrarás que el
> sistema cumple su contrato y explicarás qué cambiaste.

## Tu tablero

```text
[x] Entorno      .env configurado, doctor conectando
[x] Migraciones  npm run db:migrate (x2: la segunda omite)
[x] Seed         npm run db:seed + datos visibles en Supabase
[x] Aplicación   npm run dev responde
[x] Pruebas      npm test en verde ANTES de tocar nada
[x] Bug          tickets/BUG-106.md corregido + prueba de regresión
[x] Feature      tickets/FEATURE-206.md implementado
[x] Validación   npm run validate:class-06 → PASSED
[x] Reflexión    activities/class-06/work-log.md completo
```

## Mi trabajo en este taller (resumen)

- **BUG-106** corregido en `src/modules/requests/requests.service.js`
  (`listRequests`): una colección filtrada sin coincidencias responde `200 []`,
  no `404`. Protegido por una prueba de regresión.
- **FEATURE-206** implementado con `getHistory` (servicio) + ruta
  `GET /requests/:id/history`, reutilizando `findHistory`/`canViewHistory`/
  `mapHistoryEventRow`.
- **Verificación:** `npm test` → 19/19 · `npm run validate:class-06` →
  **PASSED 12/12** (corrido dos veces seguidas).
- **Evidencia real:** `activities/class-06/validation-evidence.txt`.
- **Bitácora + ticket de salida:** `activities/class-06/work-log.md`.

### Decisión de entorno: esquema aislado `class06`

Este taller comparte el proyecto Supabase con las clases anteriores, pero sus
tablas (`users`, `requests`, `request_history`) **chocarían** con las de la
clase 05 (`users`, `requests`, `request_status_history`, en `public`). Para no
destruir trabajo previo ni mezclar datos, la `DATABASE_URL` del taller apunta al
esquema `class06` con `?options=--search_path%3Dclass06`. Así ambas clases
coexisten en una sola base.

Consecuencia: el doctor y el validador resolvían las tablas con `public.` escrito
a mano; los ajusté para usar nombres **sin calificar**, es decir, el mismo
`search_path` que usa la aplicación. Es el cambio mínimo y correcto.


## Puesta en marcha

```bash
node --version        # se espera Node 20 o superior
npm install
cp .env.example .env  # Windows cmd: copy .env.example .env
npm run generate:secret   # pega el resultado como JWT_SECRET en .env
# DATABASE_URL: cópiala del diálogo Connect de TU proyecto en Supabase
npm run class-06:doctor
npm run db:migrate
npm run db:seed
npm run class-06:doctor   # ahora: Environment ready
npm test                  # todas verdes ANTES de modificar nada
npm run dev
```

## Comandos del taller

| Comando | Qué hace |
| ------- | -------- |
| `npm run class-06:doctor` | Diagnostica tu entorno sin tocar nada |
| `npm run db:migrate` | Aplica las migraciones pendientes (repetible) |
| `npm run db:seed` | Crea los datos del taller (repetible, no duplica) |
| `npm run generate:secret` | Genera un JWT_SECRET seguro |
| `npm test` | Toda la suite (`test:auth`, `test:requests` por archivo) |
| `npm run exercise:test-failure` | Un fallo controlado para practicar lectura |
| `npm run validate:class-06` | La validación final del taller |
| `npm run dev` | El servidor con recarga (`npm start` sin recarga) |

## Usuarios del seed (credenciales de demostración)

| Email | Password | Rol |
| ----- | -------- | --- |
| `ana.requester.seed@example.test` | `ana clave del taller 06` | requester |
| `luis.requester.seed@example.test` | `luis clave del taller 06` | requester |
| `maria.agent.seed@example.test` | `maria clave del taller 06` | agent |

Son datos de demostración del taller — tu `DATABASE_URL` y tu `JWT_SECRET`,
en cambio, son secretos reales: nunca en Git, nunca en un chat de IA.

## Tus tickets

1. `tickets/BUG-106.md` — una regresión reportada por soporte.
2. `tickets/FEATURE-206.md` — el endpoint de historial que pide producto.

Orden sugerido: entorno completo → suite en verde → BUG-106 → FEATURE-206.

## Si algo falla

`recovery/README.md` indexa la guía de recuperación por síntoma. Regla de
oro: no borres datos, no cambies código para ocultar un error, y ejecuta el
doctor antes de culpar a tu código.

## Reglas de IA

Puedes usar IA para entender archivos, seguir la petición, planificar,
implementar por pasos y generar pruebas. Tú conservas: los códigos HTTP, los
permisos, el ownership, el orden del historial, el formato de errores y la
verificación del resultado. Nunca compartas `DATABASE_URL` ni `JWT_SECRET`
— reemplázalos por `[configured]` al pegar un error.
