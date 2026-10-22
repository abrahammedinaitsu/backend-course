# Clase 08 — El cambio pequeño que toca todo

Es tu **tercera semana** como desarrollador backend junior. Producto pide
que los agentes puedan **tomar una solicitud** para atenderla
(FEATURE-801). El cambio parece pequeño… hasta que abres el módulo y
descubres un handler que mezcla HTTP, permisos, reglas, PostgreSQL,
historial y errores.

Tu trabajo: implementar el ticket y reorganizar **únicamente lo
necesario** para que el resultado sea comprensible y comprobable. Puedes
usar IA — evitando que convierta el proyecto en una colección de capas
innecesarias.

> Refactorizar cambia la estructura interna sin cambiar el comportamiento
> observable. Si cambió la ruta, el status, el body o el permiso, no fue
> solamente un refactor.

## ANTES de todo: el checkpoint de entrada (25 min)

La primera actividad del día NO es este ticket. Es el diagnóstico
acumulativo de las clases 1 a 7 — una sola ejecución, un solo reporte:

```bash
npm install
npm run progress:checkpoint
```

0. En máquina compartida: primero `git clone` de TU repositorio (o
   `git remote -v` para confirmar que el clone es tuyo). El paquete
   imprime el remoto detectado — revísalo. ¿Git te da pelea? El lab
   "Supervivencia git en máquina compartida" (sesión 1 de la clase)
   tiene el ritual completo y los rescates.
1. Abre `activities/class-08/course-progress-evidence-01-07.md`, completa
   tu `studentId` y las **siete respuestas breves** (3-6 líneas cada una).
2. Copia entero el prompt de `self-evaluation/ITSU-CHECKPOINT-01-07-1.0.md`.
3. Pégalo en el modelo de IA que tengas disponible, con el paquete dentro
   de los marcadores BEGIN_EVIDENCE / END_EVIDENCE. **Una sola conversación.**
4. Guarda la salida completa (RESULT_CODE + JSON + reporte + feedback) en
   `activities/class-08/ai-self-evaluation-01-07.md`, sin editar, y
   responde las 4 preguntas de metacognición del final.

5. **Segunda ejecución — el examen de conocimiento**: en una conversación
   NUEVA, copia el prompt de `self-evaluation/ITSU-KNOWLEDGE-01-07-1.0.md`,
   escribe COMENZAR y responde las 7 preguntas (con repreguntas) DE
   MEMORIA, sin material abierto. Guarda el transcript completo en
   `activities/class-08/ai-knowledge-exam-01-07.md`.

Si el modelo devuelve un formato inválido: conserva la respuesta, ejecuta
el prompt de reparación UNA vez (`self-evaluation/repair-prompt.md`), y si vuelve a
fallar marca `MODEL_FORMAT_FAILURE` y continúa al taller. No gastes la
clase peleando con la herramienta.

> El reporte forma parte de la evaluación del curso: el docente lo revisa
> junto con tu evidencia. Puedes cuestionarlo con argumentos, y
> `ACTION=VERIFY` significa que habrá una conversación corta de
> verificación con el docente.

## El tablero del taller

* [ ] **Checkpoint 1-7** — RESULT_CODE + JSON + reporte guardados
* [ ] **Baseline** — doctor 7/7 + migración 005 aplicada + suite verde
* [ ] **Mapa** — responsibility-map.md del handler cargado
* [ ] **Refactor** — historial separado, contrato intacto, commit
* [ ] **Contrato claim** — matriz entendida, decisión de assignedTo clara
* [ ] **Policy** — regla pura + pruebas sin HTTP
* [ ] **Service + store** — coordinación y transacción con historial
* [ ] **Route** — POST /:id/claim delgado
* [ ] **Pruebas API** — matriz completa en verde
* [ ] **Validación** — validate:class-08 → PASSED

> El taller es **autocontenido**: si un bloque no se completa en clase, se
> completa en casa — mismo starter, mismos validadores, mismas láminas
> publicadas. Lo único con hora fija es la evaluación de entrada (se hace
> en aula) y la hora límite de entrega que fije el docente. Recuerda:
> cada bloque termina en `git push`.

## Puesta en marcha (baseline, DESPUÉS de la evaluación y la pausa)

Mismo proyecto de Supabase de las clases anteriores — no crees una base nueva.

```bash
git remote -v               # ¿es TU repositorio? en máquina compartida, verifícalo SIEMPRE
git status                  # registra tu punto de partida
cp .env.example .env        # misma DATABASE_URL y JWT_SECRET de siempre
npm run class-08:doctor
npm run db:migrate          # 001-004 SKIPPED · 005 APPLIED (léela antes en database/migrations/)
npm run db:seed             # ahora incluye una solicitud YA asignada
npm test                    # verde: 39 pass, 13 todo (los todo son tuyos)
git add -A && git commit -m "class-08-baseline" && git push
```

Regla del laboratorio: **la máquina no es tuya; tu repositorio remoto sí.**
Si esta máquina no tiene tu repo, clónalo primero (`git clone <tu-url>`) y
trabaja dentro. Cada bloque del taller termina en `git push` — lo que no
está en TU GitHub no existe para la evaluación.

## Comandos del taller

| Comando | Qué hace |
| --- | --- |
| `npm run progress:checkpoint` | Genera el paquete de evidencia 1-7 (sin secretos) |
| `npm run class-08:doctor` | Diagnóstico del entorno (7 checks) |
| `npm run db:migrate` / `db:seed` | Esquema y datos (repetibles) |
| `npm test` | Suite completa — tu red de seguridad para refactorizar |
| `npm run test:policy` | Solo las pruebas de la policy (sin base, milisegundos) |
| `npm run validate:class-08` | Validador final (12 checks, incluye fronteras) |

## Los archivos del ticket

* `tickets/FEATURE-801.md` — el contrato completo y la matriz.
* `activities/class-08/responsibility-map.md` — tu análisis del handler cargado.
* `activities/class-08/refactor-log.md` — cada paso del refactor con su suite.
* `database/migrations/005_add_request_assignment.sql` — léela: NULL, FK y CHECK ampliado.

## Reglas para trabajar con IA

La IA **puede**: clasificar bloques del handler, detectar acoplamiento,
proponer un plan de pasos pequeños, revisar tu refactor buscando cambios
observables accidentales.

La IA **no decide en silencio**: crear capas (domain/, repositories/,
use-cases/…), cambiar rutas/status/bodies, borrar pruebas, ni "mejorar"
el contrato. Pídele siempre que elimine de su propia propuesta las
separaciones que no resuelven un problema presente.

## Credenciales del seed (datos de demostración)

Las mismas desde la clase 6: `ana.requester.seed@example.test`,
`luis.requester.seed@example.test`, `maria.agent.seed@example.test`
(passwords en el material de clase). María ya tiene una solicitud
asignada — el seed la reclama por ti para que veas el escenario completo.

Tu `DATABASE_URL` y tu `JWT_SECRET` siguen siendo secretos reales: jamás
en commits, chats ni capturas — y jamás dentro del paquete de evidencia.
