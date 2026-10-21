# Actividad Clase 03 — De endpoints sueltos a una API coherente

Recursos, estado y reglas. Se pasa de "tres rutas que funcionan" a "un modelo, un contrato y
reglas que protegen el sistema".

## Qué contiene esta carpeta

```txt
activities/class-03/
├── README.md            Este archivo.
├── resource-model.md    Fase 1 — modelo del recurso (propiedades, reglas, dudas).
├── http-contract.md     Fase 1 — contrato de los cuatro endpoints + formato de error.
├── transition-map.md    Fase 1 — estados y transiciones del ciclo de vida.
├── test-matrix.md       Fase 1/5 — casos esperados y resultados observados.
├── ai-usage.md          Fase 3 — registro del uso de IA (se completa después del diseño).
└── reflection.md        Fase 5 — ocho preguntas de reflexión.
```

El proyecto transversal actualizado vive en `project/` (ver su propio README).

## Fases de la entrega

1. **Diseño sin IA** — los cuatro documentos de diseño, completados antes de tocar código.
   Marca en el historial: commit + tag **`class-03-design`**.
2. **Implementación** — migrar a `modules/requests/`, máquina de estados (`request-status.js`),
   `PATCH` con transiciones, filtros y formato de error unificado.
3. **IA con contrato** — la IA revisa/propone **después** de la marca; no puede cambiar en
   silencio estados, rutas, códigos, campos ni estructura. Todo se registra en `ai-usage.md`.
4. **Decisión técnica** — `project/docs/decisions/001-cancel-instead-of-delete.md`.
5. **Verificación y reflexión** — ejecutar la matriz con `curl` y completar `reflection.md`.

## Resumen de decisiones de diseño

- **Recurso**: `Request` (solicitud de mantenimiento) con `id`, `title`, `description`,
  `status`, `priority`, `createdAt`, `updatedAt`.
- **Estados** (lista cerrada): `open`, `in_progress`, `resolved`, `closed`, `cancelled`.
- **Terminales**: `closed` y `cancelled`.
- **Cancelar en vez de borrar**: no habrá `DELETE`; se cancela con `PATCH status: "cancelled"`,
  preservando la historia.
- **Error uniforme**: `{ "error": { "code", "message" } }`.
- **Filtros** como query sobre la misma colección: `?status=` y `?priority=`, combinables;
  valor desconocido → `400`.

## Entrega

- Marca intermedia: `class-03-design`
- Tag final: `class-03-submission`
