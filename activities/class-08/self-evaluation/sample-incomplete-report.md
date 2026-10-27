# Ejemplo — reporte con evidencia INSUFICIENTE (estudiante ficticio)

Referencia de cómo se ve un reporte cuando faltan artefactos y las
respuestas no citan el proyecto. Nota el uso de `X` y de `ACTION=VERIFY`
— que NO significa fraude, sino que una conversación corta aclara más que
el paquete.

## BLOQUE 1 — RESULT_CODE

```text
ITSU-PROGRESS|V=1.0|R=BACKEND-01-07-R1|STATUS=PARTIAL|C01=2-2-1-1|C02=2-1-X-1|C03=2-2-1-2|C04=1-X-X-1|C05=3-3-1-1|C06=2-2-2-1|C07=2-2-1-1|ACTION=VERIFY
```

## BLOQUE 2 — JSON (fragmento representativo)

```json
{
  "protocolVersion": "ITSU-CHECKPOINT-01-07-1.0",
  "rubricVersion": "BACKEND-01-07-R1",
  "status": "PARTIAL",
  "action": "VERIFY",
  "studentId": "EST-DEMO-02",
  "modelReportedByStudent": "modelo-ejemplo",
  "classes": [
    {
      "classId": "04",
      "title": "PostgreSQL y persistencia",
      "levels": { "knowledge": 1, "practice": "X", "verification": "X", "explanation": 1 },
      "confidence": "low",
      "evidence": [],
      "strength": "",
      "gap": "No se encontraron migraciones ni seed propios; la respuesta 4 describe conceptos sin citar el proyecto.",
      "nextAction": "Recuperar o rehacer la entrega de la clase 4 y guardar la salida de db:migrate."
    }
  ],
  "progressPattern": { "label": "uneven", "explanation": "La clase 5 tiene implementación fuerte pero la verificación es débil en todo el recorrido." },
  "priorityConceptGaps": ["Migraciones y seed (clase 4)", "Evidencia de ejecución de pruebas", "Contrato documentado (clase 2)"],
  "studentNextSteps": [
    "Reconstruir la entrega de la clase 4 y ejecutar db:migrate guardando la salida.",
    "Correr npm test en el proyecto de la clase 6 y guardar el resultado.",
    "Responder de nuevo las preguntas 2 y 4 citando archivos concretos."
  ],
  "teacherFeedback": {
    "supportPriority": "high",
    "focusClassIds": ["04", "02", "07"],
    "topicsToReinforce": ["persistencia", "verificación con validadores"],
    "oralVerificationRecommended": true,
    "oralQuestions": [
      "Muéstrame dónde se verifica la firma del JWT y explica qué pasaría si solo se decodificara.",
      "Ejecuta npm run db:migrate y explícame qué significa SKIPPED.",
      "Elige una prueba de tu clase 6 y señala preparación, acción y comprobación."
    ],
    "integrityReview": "recommended",
    "integritySignals": ["ARTIFACT_MISSING", "TEST_OUTPUT_MISSING", "IMPLEMENTATION_EXPLANATION_GAP"],
    "reviewReason": "La implementación de la clase 5 supera con mucho lo que la explicación aportada sostiene.",
    "teacherDigest": "Apoyo prioritario en clases 4 y 2; implementación de clase 5 fuerte pero sin explicación que la respalde: verificar oralmente JWT y migraciones."
  }
}
```

## BLOQUE 4 — Feedback docente (extracto)

Existe una diferencia entre la complejidad de la implementación de la
clase 5 y la explicación aportada. Se recomienda una verificación oral
sobre la verificación de firma del JWT. Esto NO afirma fraude: pide una
conversación.
