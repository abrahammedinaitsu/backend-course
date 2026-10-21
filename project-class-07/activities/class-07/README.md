# Entrega 07 — Diagnóstico y errores observables

## Qué entregas

* El proyecto con los tres incidentes resueltos y el validador en PASSED.
* `incident-report.md` — tu reporte de incidentes, completado **mientras**
  investigas, no reconstruido de memoria al final.
* `validation-evidence.txt` — la salida real y completa de
  `npm run validate:class-07` con `FINAL RESULT: PASSED`.

## Qué NO entregas

* `.env` (contiene tu cadena de conexión y tu secreto reales).
* Tokens, passwords o logs que contengan un header `Authorization`.
* Capturas de tu panel de Supabase con credenciales visibles.

## Commits sugeridos

| Momento | Mensaje |
| --- | --- |
| Doctor en verde y suite inicial verde | `class-07-baseline` |
| INC-701 e INC-702 corregidos con sus pruebas | `class-07-incidents-resolved` |
| OPS-703 completo y validador en PASSED | `class-07-submission` |

Etiqueta final:

```bash
git tag class-07-submission
```

## Cómo se evalúa

| Dimensión | Peso |
| --- | --- |
| Reproducción y diagnóstico | 25% |
| Corrección de incidentes | 20% |
| Manejo consistente de errores | 20% |
| Request ID y logs seguros | 15% |
| Pruebas y validador | 15% |
| Explicación y uso de IA | 5% |

No se evalúa memoria de sintaxis ni sofisticación del prompt. Una
corrección que funciona pero que no puedes relacionar con la causa se
considera **incompleta**.
