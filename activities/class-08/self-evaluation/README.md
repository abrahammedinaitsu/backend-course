# Kit de autoevaluación — checkpoint 1-7

Todo lo que necesitas para el diagnóstico acumulativo está en esta carpeta.
El procedimiento completo, paso a paso:

## Paso a paso

1. **Genera el paquete** desde la raíz del proyecto, dentro de TU repo del
   curso — en máquina compartida, clónalo primero o confirma con
   `git remote -v` que el clone es tuyo (el generador imprime el remoto
   detectado: revísalo). Luego `npm install` y `npm run progress:checkpoint`.
   El paquete queda en `activities/class-08/course-progress-evidence-01-07.md`.
2. **Complétalo**: escribe tu `studentId` y responde las **siete preguntas
   breves** (3-6 líneas cada una, citando archivos y decisiones de TU
   proyecto). Las respuestas son tuyas — la IA evalúa después, no redacta.
3. **Verifica el paquete** antes de gastar tu ejecución: sin secretos
   (`DATABASE_URL`, `JWT_SECRET`, tokens), con `FOUND` en las clases que
   trabajaste, y las siete respuestas completas. El lab "Kit del
   checkpoint" tiene el checklist.
4. **Copia el prompt COMPLETO** de `ITSU-CHECKPOINT-01-07-1.0.md` — de la
   primera línea a la última, sin modificar nada. El schema del JSON ya
   viene incluido dentro del prompt.
5. **Pega tu paquete** entre los marcadores `BEGIN_EVIDENCE` y
   `END_EVIDENCE`: sustituye la línea de marcador de posición por el
   contenido ÍNTEGRO de `course-progress-evidence-01-07.md` (de la primera
   línea a la última). **El paquete ES toda la evidencia** — el script ya
   reunió lo que existe en tu repo y tú ya escribiste tus 7 respuestas
   dentro. No agregues capturas, código suelto, enlaces ni archivos extra:
   lo que no esté en el paquete, el modelo lo marcará como no evaluable, y
   lo que agregues por fuera no cuenta.
6. **Ejecuta UNA sola vez**, en UNA sola conversación con el modelo de IA
   que tengas disponible. No dividas por clase ni repitas la ejecución.
7. **Verifica el formato de la salida**: la primera línea sigue el patrón
   `ITSU-PROGRESS|V=1.0|R=BACKEND-01-07-R1|…`; el JSON es válido; hay
   exactamente cuatro bloques.
8. **¿Formato inválido?** Conserva la respuesta recibida y usa
   `repair-prompt.md` UNA vez, en la misma conversación. Si vuelve a
   fallar: marca `MODEL_FORMAT_FAILURE` en tu archivo de entrega y
   continúa al taller.
9. **Guarda TODO sin editar** en
   `activities/class-08/ai-self-evaluation-01-07.md`: los cuatro bloques
   íntegros más la metadata (modelo utilizado, fecha, commit evaluado).
10. **Responde las 4 preguntas de metacognición** al final de ese archivo
    y confirma tu entrega. El docente revisa el reporte junto con tu
    evidencia y puede verificarlo oralmente.

## Segunda ejecución — el examen de conocimiento (mismo día)

Después de entregar la evidencia viene la SEGUNDA conversación, distinta
y con otro prompt: el examen conversacional `ITSU-KNOWLEDGE-01-07-1.0.md`.

1. **Cierra el material**: el examen es de memoria. Sin láminas, sin repo
   abierto, sin apuntes. (Tu editor puede quedar abierto solo para pegar
   el resultado al final.)
2. **Copia el prompt COMPLETO** de `ITSU-KNOWLEDGE-01-07-1.0.md` en una
   conversación NUEVA (no la de la evidencia) y escribe `COMENZAR`.
3. **Responde las 7 preguntas y sus repreguntas** con tus palabras. No le
   pidas ayuda al modelo durante el examen — lo registra como señal.
4. **Exporta y guarda el TRANSCRIPT COMPLETO** (preguntas, respuestas,
   repreguntas y los 4 bloques del cierre) en
   `activities/class-08/ai-knowledge-exam-01-07.md`, sin editar, y
   responde sus 2 preguntas de metacognición. Cómo exportar según tu
   herramienta:
   * **Gemini (web)**: menú de compartir/exportar de la conversación si tu
     versión lo ofrece; si no, sube al inicio del chat, selecciona desde tu
     primer mensaje hasta el aviso final y copia.
   * **Copilot en VS Code**: paleta de comandos (Ctrl/Cmd+Shift+P) →
     "Chat: Export Chat/Session" — o clic derecho en el chat → copiar todo.
   * **Copilot (web)**: no tiene exportación completa fiable — selecciona
     toda la conversación y copia.
   * **opencode / agentes de terminal**: usa su comando de exportar o
     compartir sesión (`/export` o `/share`) si existe; si no, selecciona y
     copia el scrollback completo del terminal.
   * **Cualquier otra**: seleccionar todo + copiar SIEMPRE funciona.
   Verifica que lo pegado empiece en el prompt/`COMENZAR` y termine en el
   aviso de exportación. **Captura de pantalla NO sirve**: debe ser texto.
5. **Formato inválido en el cierre**: pídele UNA vez "reformatea tu cierre
   siguiendo el formato obligatorio, sin reevaluar". Si falla de nuevo:
   marca `MODEL_FORMAT_FAILURE` y continúa.

Las dos evaluaciones se cruzan: la evidencia dice qué EXISTE en tu repo;
el examen dice qué puedes EXPLICAR sin él. El docente revisa ambas — y
las diferencias entre una y otra son justamente lo que conversará contigo.

## Qué es cada archivo

| Archivo | Qué es |
| --- | --- |
| `ITSU-CHECKPOINT-01-07-1.0.md` | El prompt de evaluación. Se copia COMPLETO, sin editar (incluye el schema del JSON). |
| `ITSU-KNOWLEDGE-01-07-1.0.md` | El prompt del EXAMEN de conocimiento (segunda conversación, de memoria). |
| `repair-prompt.md` | El prompt de reparación de formato. Una sola pasada, solo si la salida es inválida. |
| `report-schema.json` | El schema del BLOQUE 2, como archivo aparte (referencia y validación local). |
| `rubric-classes-01-07.md` | La rúbrica: escala 0-4/X, dimensiones K-P-V-E y criterios por clase. |
| `progress-evidence-template.md` | La estructura del paquete de evidencia (el script la genera por ti). |
| `sample-complete-report.md` | Ejemplo de salida bien formada con evidencia completa. |
| `sample-incomplete-report.md` | Ejemplo con evidencia faltante: niveles X, señales y ACTION=VERIFY. |
