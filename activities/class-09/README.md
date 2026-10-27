# Clase 09 — Entrar, entender y cambiar sin romper

Es tu **cuarta semana**. Te rotan a otro squad que mantiene el mismo
producto: te reciben con un repositorio que ya funciona, una base de
datos, pruebas en verde y un **reporte de seguridad** (BUG-901). Nadie
tiene tiempo de explicarte archivo por archivo. Antes de corregir nada
debes demostrar que puedes orientarte: cómo arranca, por dónde entra una
petición, dónde se autoriza, dónde se consulta PostgreSQL y qué pruebas
protegen el comportamiento.

> Un junior útil no necesita conocer todo el sistema. Necesita saber
> construir un mapa, encontrar evidencia y verificar sus decisiones.

La clase tiene DOS fases con reglas distintas — y la diferencia importa:

* **Fase A — Evaluación conversacional (60 min, al llegar).** El modelo de
  IA actúa como EVALUADOR: pregunta, pide evidencia y repregunta. No
  enseña, no resuelve, no escribe código. Cubre las clases 1 a 8 (incluida
  la evaluación diferida del tema 8 prometida la clase pasada).
* **Fase B — Taller (después del descanso).** El modelo vuelve a ser
  ASISTENTE: puede explicar, comparar hipótesis, proponer rutas, sugerir
  código y revisar cambios — contigo como responsable de verificar.

## AL LLEGAR: pantalla de llegada (Fase A)

1. Clona o actualiza TU repositorio del curso (`git remote -v` — en
   máquina compartida, verifícalo SIEMPRE) y descomprime este starter
   DENTRO de tu repo — sugerido: `activities/class-09/` (o la carpeta de
   clase 9 según tu estructura). Importa que quede dentro: la tarjeta de
   evaluación detecta ahí tu historia del curso. Luego `npm install`.
2. Ejecuta el comando de preparación con tu correo del curso (solo la
   parte antes de la @ se usa como identificador):

   ```bash
   npm run assessment:prepare -- --student=TU_CORREO
   ```

   Genera `assessment/assessment-card.json`: tu variante individual, el
   endpoint que te tocó y la evidencia inicial del repositorio. Sin
   secretos — revísala igual.
3. Abre el modelo de IA autorizado o el que tengas disponible.
4. Copia COMPLETO el prompt de `assessment/evaluator-prompt.md`, sin
   modificarlo, en una conversación NUEVA, y pega tu tarjeta donde el
   prompt lo indica.
5. Responde las **cinco preguntas** dentro de la MISMA conversación, una a
   la vez, con evidencia del repositorio (archivos, funciones, pruebas,
   salidas de comandos). El evaluador repregunta: eso es parte del diseño.
6. Al cerrar: guarda los cuatro bloques y **exporta la conversación
   completa**. Entrega según `assessment/README.md` y valida con:

   ```bash
   npm run assessment:validate
   ```

Si el modelo rompe el formato final: `assessment/repair-prompt.md`, UNA
vez. Si falla de nuevo: conserva el historial, marca `MODEL_FORMAT_FAILURE`
y continúa — la clase no se gasta peleando con el proveedor.

## El tablero del taller (Fase B, tras el descanso)

* [ ] **Evaluación** — historial + reporte entregados y validados
* [ ] **Baseline** — doctor 7/7 · migraciones SKIPPED · seed · suite verde
* [ ] **Inventario** — sección 2 del dossier con evidencia por fila
* [ ] **Recorrido** — GET /requests/:id trazado paso a paso
* [ ] **Auditoría** — 15 áreas clasificadas con evidencia
* [ ] **BUG-901 reproducido** — el acceso indebido, visto con tus ojos
* [ ] **Análisis de impacto** — sección 8 completa + commit `class-09-analysis`
* [ ] **Corrección** — cambio mínimo, policy consultada, commit `class-09-fix`
* [ ] **Pruebas** — regresión nueva en verde + suite completa verde
* [ ] **Validación** — `validate:class-09` → PASSED

## Puesta en marcha (baseline del taller)

Mismo proyecto de Supabase desde la clase 06 — no crees una base nueva.

```bash
git remote -v               # ¿es TU repositorio?
cp .env.example .env        # misma DATABASE_URL y JWT_SECRET de siempre
npm run doctor              # 7 checks
npm run db:migrate          # 001-005: todas SKIPPED (las conoces todas)
npm run db:seed             # repetible
npm test                    # verde: los todo son tuyos
git add -A && git commit -m "class-09-baseline" && git push
```

Regla del laboratorio: **la máquina no es tuya; tu repositorio remoto sí.**
Cada bloque termina en `git push`.

Registra en `activities/class-09/work-log.md` cada comando: qué esperabas,
qué obtuviste, qué te bloqueó y cómo lo resolviste. Si Supabase da pelea,
`recovery/environment.md` tiene los rescates — no gastes el taller en eso.

## El trabajo del taller

1. **Expediente técnico** (`activities/class-09/system-dossier.md`): un
   solo documento con inventario, recorrido de `GET /requests/:id`,
   auditoría de prácticas mínimas y análisis de impacto. Cada afirmación
   con evidencia; cada duda, declarada.
2. **BUG-901** (`tickets/BUG-901.md`): reproducir → analizar impacto →
   commit `class-09-analysis` → corregir lo MÍNIMO → pruebas de regresión
   → commit `class-09-fix`.
3. **Validación**: `npm run validate:class-09` → PASSED → commit
   `class-09-submission` + push.

## Comandos del taller

| Comando | Qué hace |
| --- | --- |
| `npm run assessment:prepare -- --student=ID` | Genera tu tarjeta de evaluación (Fase A) |
| `npm run assessment:validate` | Valida formato y cálculo de tu reporte de evaluación |
| `npm run doctor` | Diagnóstico del entorno (7 checks) |
| `npm run db:migrate` / `db:seed` | Esquema y datos (repetibles) |
| `npm test` | Suite completa — tu red de seguridad |
| `npm run test:policy` | Pruebas puras de policies (sin base, milisegundos) |
| `npm run test:detail` / `test:regression` | Las pruebas del ticket |
| `npm run validate:class-09` | Validador final (14 checks) |

## Reglas para trabajar con IA (Fase B)

La IA **puede**: explicar un archivo que le pegues, ayudarte a seguir
llamadas, cuestionar tus hipótesis, revisar tu análisis de impacto,
proponer pruebas en el estilo del proyecto y revisar tu cambio contra el
ticket. Las tarjetas listas para copiar están en las láminas y lecturas.

La IA **no decide en silencio**: no conoce archivos que no le diste, no
dicta el diff final sin que lo verifiques, y no agrega capas (controllers,
repositories, DTOs…) que el problema no pide. Registra en el work-log qué
aceptaste y qué rechazaste — la sección "What I rejected" vale más que
ninguna.

> El taller es **autocontenido**: lo que no alcance en clase se termina en
> casa — mismo starter, mismos validadores, mismas láminas publicadas. La
> evaluación de la Fase A es solo presencial.

## Credenciales del seed (datos de demostración)

Las mismas desde la clase 6: `ana.requester.seed@example.test`,
`luis.requester.seed@example.test`, `maria.agent.seed@example.test`
(passwords en el material de clase). Tu `DATABASE_URL` y tu `JWT_SECRET`
siguen siendo secretos reales: jamás en commits, chats, tarjetas de
evaluación ni capturas.
