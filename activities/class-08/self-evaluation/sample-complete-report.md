# Ejemplo — reporte COMPLETO (estudiante ficticio)

Salida de referencia con evidencia sólida en casi todas las clases. Los
niveles son de un caso inventado: tu reporte será distinto.

## BLOQUE 1 — RESULT_CODE

```text
ITSU-PROGRESS|V=1.0|R=BACKEND-01-07-R1|STATUS=COMPLETE|C01=3-3-3-3|C02=3-3-3-2|C03=4-3-3-3|C04=3-3-2-3|C05=3-4-3-3|C06=3-3-4-3|C07=3-3-3-4|ACTION=NONE
```

## BLOQUE 2 — JSON (fragmento representativo)

```json
{
  "protocolVersion": "ITSU-CHECKPOINT-01-07-1.0",
  "rubricVersion": "BACKEND-01-07-R1",
  "status": "COMPLETE",
  "action": "NONE",
  "studentId": "EST-DEMO-01",
  "modelReportedByStudent": "modelo-ejemplo",
  "classes": [
    {
      "classId": "04",
      "title": "PostgreSQL y persistencia",
      "levels": { "knowledge": 3, "practice": 3, "verification": 2, "explanation": 3 },
      "confidence": "medium",
      "evidence": [
        { "artifact": "database/migrations/004_add_constraints_and_indexes.sql", "reference": "restricciones CHECK y evolución con ALTER TABLE" },
        { "artifact": "activities/class-04/…", "reference": "explicación de transacción con rollback" }
      ],
      "strength": "Distingue restricción de base y validación de aplicación con ejemplos propios.",
      "gap": "La evidencia de rollback es narrativa: no hay salida de comando guardada.",
      "nextAction": "Reproducir la transacción fallida y guardar la salida real."
    }
  ],
  "progressPattern": { "label": "improving", "explanation": "La verificación se fortalece a partir de la clase 6." },
  "priorityConceptGaps": ["Evidencia de rollback ejecutada", "Justificación de status codes en el contrato"],
  "studentNextSteps": [
    "Reproducir y guardar la salida de la transacción con fallo (clase 4).",
    "Anotar por qué cada endpoint usa su status en http-contract.md (clase 2).",
    "Mantener el hábito de correr la suite completa antes de cada entrega."
  ],
  "teacherFeedback": {
    "supportPriority": "low",
    "focusClassIds": ["04"],
    "topicsToReinforce": ["evidencia ejecutada vs narrada"],
    "oralVerificationRecommended": false,
    "oralQuestions": [],
    "integrityReview": "not_needed",
    "integritySignals": ["NONE"],
    "reviewReason": "",
    "teacherDigest": "Recorrido sólido y verificado; único refuerzo: guardar la evidencia ejecutada del rollback de la clase 4."
  }
}
```

## BLOQUE 3 — Reporte del estudiante (extracto)

Panorama general: tu recorrido muestra evidencia verificable en las siete
clases, con validadores en PASSED guardados desde la clase 5…

## BLOQUE 4 — Feedback docente (extracto)

Resumen ejecutivo: sin prioridad de apoyo ni verificación. Un refuerzo
puntual: pedir la reproducción en vivo del rollback (clase 4)…
