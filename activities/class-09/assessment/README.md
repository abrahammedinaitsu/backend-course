# Evaluación conversacional — ITSU-KNOWLEDGE-09-1.0

Sesenta minutos, cinco preguntas integradoras (clases 1 a 8, incluida la
evaluación diferida del tema 8), UNA conversación. El modelo actúa como
EVALUADOR: pregunta, pide evidencia y repregunta — no enseña ni resuelve.
Todo lo que necesitas está en esta carpeta.

## Paso a paso

1. **Genera tu tarjeta** desde la raíz del proyecto, con tu identificador
   del curso — tu correo (se usa solo la parte antes de la @; la dirección
   completa nunca viaja al chat) o tu ID académico:

   ```bash
   npm run assessment:prepare -- --student=TU_CORREO
   ```

   El flag `--studentId=` también funciona.

   Produce `assessment-card.json`: tu variante individual (determinista:
   mismo estudiante + mismo commit = misma variante), el endpoint que te
   tocó y la evidencia inicial del repositorio. Como el starter vive DENTRO
   de tu repositorio de la materia, la tarjeta también mira tu repo
   completo: tus carpetas de clases (se llamen como se llamen) y, si los
   encuentra, los resultados de tu evaluación de la clase 8 — el evaluador
   los usa solo para retomar tus temas de repaso y registrar tu progreso,
   nunca para calificar las respuestas de hoy. Si no aparecen, no pasa
   nada ni se penaliza. No contiene secretos — revísala igual antes de
   pegarla.
2. **Copia el prompt COMPLETO** de `evaluator-prompt.md` — de la primera
   línea a la última, sin modificarlo — en una conversación NUEVA.
3. **Pega tu tarjeta** donde el prompt dice `BEGIN_CARD`/`END_CARD`
   (sustituye la línea de marcador por el contenido íntegro del JSON) y
   escribe `COMENZAR`.
4. **Responde las cinco preguntas**, una a la vez, dentro de la MISMA
   conversación. Reglas de juego:
   * Cita evidencia concreta: archivos, funciones, pruebas, tablas.
     Puedes (debes) abrir el repositorio y pegar fragmentos relevantes.
   * Cuando la pregunta pida una PREDICCIÓN, escríbela ANTES de abrir los
     archivos y márcala como predicción.
   * Puedes compartir salidas reales de comandos (`npm test`, etc.) —
     nunca tu `.env`, tokens ni cadenas de conexión.
   * Puedes rectificar una respuesta: rectificar con evidencia suma.
   * Si le pides la respuesta al evaluador, te redirigirá y lo registrará
     como señal. No es un castigo — pero no insistas.
5. **Cierre**: tras la quinta pregunta el evaluador produce 4 bloques:
   RESULT_CODE, JSON, tu reporte y el feedback docente.
6. **Exporta y guarda** (el evaluador imprime este aviso al final):
   * la conversación COMPLETA → `conversation-transcript.md` (sustituye el
     marcador; incluye prompt, tarjeta, preguntas, tus respuestas,
     repreguntas, rectificaciones y los 4 bloques) y completa la
     **Integrity declaration** del final;
   * el BLOQUE 2 (solo el JSON) → `evaluator-report.json`;
   * los bloques 1, 3 y 4 → `evaluator-report.md`.

   Cómo exportar: Gemini (compartir/exportar o selección manual completa);
   Copilot en VS Code (paleta → "Chat: Export Chat"); Copilot web
   (seleccionar todo y copiar); opencode/terminal (`/export`/`/share` o
   copiar el scrollback). Seleccionar todo + copiar SIEMPRE funciona.
   Captura de pantalla NO sirve: debe ser texto.
7. **Valida localmente**:

   ```bash
   npm run assessment:validate
   ```

   Comprueba formato, consistencia RESULT_CODE↔JSON y recalcula el puntaje
   (el modelo asigna niveles; el número lo calcula el script). Genera
   `local-validation.txt`. Si algo sale FAIL, el mensaje dice qué archivo
   corregir — casi siempre es un bloque guardado en el archivo equivocado.
8. **Entrega**: `git add -A && git commit -m "class-09-assessment" && git push`.
   La entrega son los CUATRO archivos: transcript, report.json, report.md y
   local-validation.txt. **Un reporte sin su conversación no es entrega.**

## Si el modelo rompe el formato final

Usa `repair-prompt.md` UNA sola vez, en la misma conversación. Si vuelve a
fallar: conserva el historial tal cual, marca `MODEL_FORMAT_FAILURE` en la
metadata del transcript y continúa al taller. No gastes la clase
resolviendo un problema del proveedor.

## Qué mide (y qué no)

Cada pregunta se clasifica en cuatro dimensiones 0-4: **C** comprensión,
**G** conexión con el sistema (grounding), **R** razonamiento y **V**
verificación. El puntaje bruto (máx. 80) y el score sobre 100 los calcula
tu validador local — la banda resultante es lectura formativa, no una
calificación oficial por sí sola. El docente revisa primero el resumen
compacto y puede hacerte una verificación oral breve de 2-4 minutos: no es
una acusación, es parte del diseño. La evaluación no mide velocidad
escribiendo sintaxis, extensión ni vocabulario — mide razonamiento
aplicado sobre ESTE repositorio.

## Qué es cada archivo

| Archivo | Qué es |
| --- | --- |
| `evaluator-prompt.md` | El prompt del evaluador. Se copia COMPLETO, sin editar. |
| `assessment-card.json` | Tu tarjeta generada (variante + evidencia inicial). Se pega dentro del prompt. |
| `repair-prompt.md` | Reparación de formato. Una sola pasada. |
| `report-schema.json` | El schema del BLOQUE 2 (referencia; el validador lo aplica). |
| `conversation-transcript.md` | AQUÍ guardas la conversación completa + integrity declaration. |
| `evaluator-report.json` | AQUÍ guardas el BLOQUE 2 (solo el JSON). |
| `evaluator-report.md` | AQUÍ guardas los bloques 1, 3 y 4. |
| `local-validation.txt` | Lo genera `npm run assessment:validate`. |
