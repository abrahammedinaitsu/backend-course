# Entrega 08 — Refactoring y responsabilidades

## Qué entregas

* El proyecto con el refactor aplicado y FEATURE-801 (claim) implementado.
* `responsibility-map.md` — el análisis del handler cargado.
* `refactor-log.md` — el registro de pasos con la suite como red.
* `validation-evidence.txt` — salida real de `npm run validate:class-08` en PASSED.
* `course-progress-evidence-01-07.md` — el paquete generado del checkpoint.
* `ai-self-evaluation-01-07.md` — RESULT_CODE + JSON + reporte + tu lectura crítica.
* `ai-knowledge-exam-01-07.md` — el transcript completo del examen de conocimiento (segunda conversación del checkpoint).
* `class-08-evidence.md` — la evidencia del tema 8 para el checkpoint de la próxima clase.

## Qué NO entregas

* `.env`, tokens, logs con secretos, `node_modules/`.

## Commits — y el push que los hace reales

| Momento | Mensaje |
| --- | --- |
| Suite verde antes de tocar nada | `class-08-baseline` |
| Handler separado, contrato intacto | `class-08-refactor` |
| Claim completo con sus pruebas | `class-08-feature` |
| Validador PASSED + evidencias | `class-08-submission` |

Después de CADA commit:

```bash
git push
```

Trabajas en computadoras compartidas: la máquina no es tuya y su historial
local no cuenta como entrega. **Lo que no está en TU repositorio remoto de
GitHub no existe para la evaluación.** La entrega queda hecha cuando el
commit `class-08-submission` está visible en tu repositorio en GitHub.

## Cómo se evalúa

El tema 8 se evalúa al comenzar la PRÓXIMA clase con un checkpoint breve
(mismo formato que el 7-en-1, solo C08, máximo dos preguntas orales).
Por eso `class-08-evidence.md` importa tanto como el código.
