# Reparación de formato — ITSU-KNOWLEDGE-09-1.0

## Cuándo usarlo (léelo, no lo pegues)

Úsalo **una sola vez**, en la **misma conversación** de tu evaluación,
únicamente si el cierre no cumple el formato: el RESULT_CODE no sigue el
patrón, el JSON es inválido o no respeta el schema, falta un bloque o hay
texto fuera de los cuatro bloques.

Antes de usarlo, conserva la salida inválida (va al transcript de todos
modos). Si tras la reparación vuelve a fallar: guarda todo, marca
`MODEL_FORMAT_FAILURE` en la metadata del transcript y continúa al taller.

La reparación **reformatea, jamás reevalúa**: si el modelo cambia niveles,
evidencias o conclusiones, esa salida no sirve como reparación.

---

## El prompt (copia todo lo que sigue y pégalo como tu siguiente mensaje)

Tu evaluación ya terminó, pero el formato final no cumple
ITSU-KNOWLEDGE-09-1.0.

No hagas nuevas preguntas.
No cambies puntuaciones, evidencias ni conclusiones.

Reformula únicamente la salida en cuatro bloques:

1. RESULT_CODE — una sola línea con el patrón exacto:
   ITSU-KNOWLEDGE|V=1.0|R=BACKEND-01-08-K1|ID=<EVALUATION_ID>|Q1=C-G-R-V|Q2=C-G-R-V|Q3=C-G-R-V|Q4=C-G-R-V|Q5=C-G-R-V|ACTION=<NONE_SUPPORT_OR_VERIFY>
2. JSON válido conforme al schema del prompt original, sin comentarios ni
   trailing commas, con exactamente cinco elementos en questions.
3. Reporte del estudiante (las secciones del prompt original).
4. Feedback docente.

Después del bloque 4, imprime de nuevo el AVISO DE EXPORTACIÓN literal.
No agregues ningún otro texto.
