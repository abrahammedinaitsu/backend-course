# Fase A — Evaluación conversacional (PENDIENTE, la haces tú)

> Este proyecto entrega las DOS fases de la clase 09. La **Fase B (taller)**
> está completa: dossier, work-log, fix de BUG-901, pruebas de regresión y
> `validation-evidence.txt` con `FINAL RESULT: PASSED` (14/14).
>
> La **Fase A** — la evaluación conversacional de 60 minutos — es
> presencial y personal por diseño: un modelo EVALÚA (no enseña ni resuelve)
> cinco preguntas sobre ESTE repositorio. Nadie más puede hacerla por ti ni
> firmar tu declaración de integridad. Por eso esta carpeta se deja lista
> pero sin completar.

---

## Qué falta exactamente

Los CUATRO archivos de entrega de la Fase A:

| Archivo | Estado actual | Qué debes poner |
| --- | --- | --- |
| `evaluator-report.json` | placeholder | El **BLOQUE 2** (solo el JSON) del cierre, tal cual. |
| `evaluator-report.md` | plantilla | Los bloques **1, 3 y 4** del cierre. |
| `conversation-transcript.md` | plantilla | La conversación COMPLETA + tu **declaración de integridad** firmada. |
| `local-validation.txt` | no existe | Lo genera `npm run assessment:validate` cuando los otros tres estén correctos. |

Los tres primeros tienen marcadores `[COMPLETAR]` / `[PEGAR ...]`: no los
borres, sustitúyelos por tu contenido real.

## Paso a paso

1. **Genera tu tarjeta** (desde `project-class-09/`), con tu correo del
   curso o tu ID académico:

   ```bash
   npm run assessment:prepare -- --student=TU_CORREO
   ```

   Produce `assessment-card.json`: variante individual (determinista),
   endpoint objetivo y evidencia inicial del repo. No contiene secretos,
   pero revísala antes de pegarla.

2. **Abre una conversación NUEVA** con el modelo evaluador y copia el
   prompt COMPLETO de `evaluator-prompt.md` (de la primera a la última
   línea, sin editar).

3. Pega el contenido íntegro de `assessment-card.json` entre los marcadores
   `BEGIN_CARD`/`END_CARD` (sustituye la línea de marcador) y escribe
   `COMENZAR`.

4. **Responde las cinco preguntas** una a la vez, en la misma conversación.
   Cita evidencia real (archivos, funciones, pruebas, tablas). Cuando se
   pida una PREDICCIÓN, escríbela ANTES de mirar y márcala como predicción.
   Nunca pegues tu `.env`, tokens ni cadenas de conexión.

5. Al cierre el evaluador produce **cuatro bloques** + el aviso de
   exportación. Expórtalos así:
   * conversación COMPLETA → `conversation-transcript.md` (y firma la
     sección **Integrity declaration** al final);
   * BLOQUE 2 (solo el JSON) → `evaluator-report.json`;
   * bloques 1, 3 y 4 → `evaluator-report.md`.

   Cómo exportar: Gemini (compartir/exportar o selección manual completa);
   Copilot en VS Code (paleta → "Chat: Export Chat"); Copilot web
   (seleccionar todo y copiar); opencode/terminal (`/export`, `/share` o
   copiar el scrollback). **Seleccionar todo + copiar siempre funciona.**
   Captura de pantalla NO sirve: debe ser texto.

6. **Valida localmente:**

   ```bash
   npm run assessment:validate
   ```

   Comprueba formato, consistencia RESULT_CODE↔JSON y recalcula el puntaje.
   Genera `assessment/local-validation.txt`, que debe terminar en
   `FINAL RESULT: VALID`. Si algo sale FAIL, el mensaje dice qué archivo
   corregir (casi siempre es un bloque guardado en el archivo equivocado).

7. **Commit y push** cuando los cuatro archivos estén:

   ```bash
   git add -A
   git commit -m "class-09-assessment"
   git push
   ```

   **Un reporte sin su conversación no es entrega.**

## Si el modelo rompe el formato final

Usa `repair-prompt.md` UNA sola vez, en la misma conversación. Si vuelve a
fallar: conserva el historial tal cual, marca `MODEL_FORMAT_FAILURE` en la
metadata del transcript y sigue. No gastes la clase resolviendo un problema
del proveedor.

## Archivos de apoyo (NO se entregan)

`evaluator-prompt.md`, `repair-prompt.md`, `report-schema.json` y
`assessment-card.json` (cuando lo generes) son material de trabajo.
La entrega son los cuatro archivos de la tabla de arriba.

## Qué mide (y qué no)

Cada pregunta se clasifica en cuatro dimensiones 0-4: **C** comprensión,
**G** conexión con el sistema, **R** razonamiento y **V** verificación.
Los niveles los asigna el modelo; el puntaje numérico lo calcula el
validador local. La banda resultante es lectura formativa. El docente puede
hacer una verificación oral breve (2-4 minutos) a partir de TU material: no
es una acusación, es parte del diseño. No se mide velocidad, extensión ni
vocabulario — se mide razonamiento aplicado sobre ESTE repositorio.

## Referencia: la Fase B ya está hecha

Si el evaluador te pregunta durante la Fase A, todo lo que necesitas citar
ya existe en el repo:

* `activities/class-09/system-dossier.md` — recorrido de `GET /requests/:id`,
  inventario, authn/authz, análisis de impacto y dudas declaradas.
* `activities/class-09/work-log.md` — reproducción de BUG-901, evidencia
  verificada, fix aceptado y anti-fixes rechazados.
* `activities/class-09/validation-evidence.txt` — salida real del validador
  (14/14 PASSED).
* `src/modules/requests/requests.service.js` — el fix en `getRequest`.
* `test/request-detail.test.js` y `test/request-access-policy.test.js` — las
  regresiones convertidas.
