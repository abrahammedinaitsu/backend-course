# ITSU-REPAIR-01-07-1.0 — Prompt de reparación de formato

## Cuándo usarlo (léelo, no lo pegues)

Úsalo **una sola vez**, en la **misma conversación** donde ejecutaste
`ITSU-CHECKPOINT-01-07-1.0`, únicamente si la salida no cumple el formato:

* la primera línea no sigue el patrón exacto del RESULT_CODE;
* el JSON del BLOQUE 2 no es válido o no respeta el schema;
* falta alguno de los cuatro bloques, o hay texto fuera de ellos.

Antes de usarlo, **conserva la respuesta inválida** (cópiala a tu archivo de
entrega). Si tras la reparación la salida vuelve a ser inválida: guarda ambas
respuestas, marca `MODEL_FORMAT_FAILURE` en la metadata de
`activities/class-08/ai-self-evaluation-01-07.md` y continúa al taller. No
gastes la clase peleando con la herramienta.

La reparación **reformatea, jamás reevalúa**: si el modelo cambia niveles,
señales o juicios, esa salida no sirve como reparación.

---

## El prompt (copia todo lo que sigue y pégalo como tu siguiente mensaje)

Tu respuesta anterior no cumple el formato obligatorio del protocolo
ITSU-CHECKPOINT-01-07-1.0.

Reformatea tu evaluación anterior. Reglas estrictas:

1. No reevalúes: conserva exactamente los mismos niveles, señales,
   citas de evidencia y juicios que ya produjiste.
2. Produce nuevamente los cuatro bloques exactos y nada más:
   BLOQUE 1 — RESULT_CODE, BLOQUE 2 — JSON, BLOQUE 3 — REPORTE DEL
   ESTUDIANTE, BLOQUE 4 — FEEDBACK DOCENTE.
3. El BLOQUE 1 es una sola línea con el patrón exacto:
   ITSU-PROGRESS|V=1.0|R=BACKEND-01-07-R1|STATUS=<STATUS>|C01=K-P-V-E|C02=K-P-V-E|C03=K-P-V-E|C04=K-P-V-E|C05=K-P-V-E|C06=K-P-V-E|C07=K-P-V-E|ACTION=<NONE_SUPPORT_OR_VERIFY>
4. El BLOQUE 2 debe ser JSON válido conforme al schema incluido en el
   prompt original, sin comentarios ni trailing commas.
5. No agregues explicaciones sobre la corrección ni texto fuera de los
   cuatro bloques.
