# Actividad Clase 04 — De SQL al backend persistente

Persistencia, integridad e historia. El estado deja de vivir en el proceso y pasa a una base de
datos compartida: PostgreSQL (en Supabase). Persistir no es cambiar un array por una tabla — es
decidir cómo **representar, proteger, recuperar y coordinar** el estado.

## Qué contiene esta carpeta

```txt
activities/class-04/
├── README.md               ← este archivo
├── data-model.md           ← tablas, tipos, claves, reglas por capa (fase 1, sin IA)
├── persistence-contract.md ← las operaciones del store (fase 1, sin IA)
├── query-matrix.md         ← operación → SQL → parámetros (fase 1, sin IA)
├── transaction-plan.md     ← la unidad de trabajo y sus fallos (fase 1, sin IA)
├── error-map.md            ← categorías de error (fase 1, sin IA)
├── test-matrix.md          ← casos y resultados observados
├── ai-usage.md             ← registro del uso de IA (fase 4)
└── reflection.md           ← reflexión final (fase 6)
```

El proyecto actualizado vive en `project/` (raíz del repositorio).

## Cómo ejecutar el proyecto

```bash
cd project
npm install
copy .env.example .env      # Windows (o `cp` en Linux/macOS)
# editar .env con TU DATABASE_URL (Session pooler, puerto 5432)
npm run db:check            # prueba de conexión (imprime la base y la versión, nunca la URL)
# ejecutar database/migrations/001 y 002 en el SQL Editor de Supabase, en orden
npm start                   # Request API en http://localhost:3000
```

> **Evidencia sin secretos**: los comandos, el nombre de la base, las tablas y los resultados de
> consultas **sí** se muestran; la URL completa y la contraseña **nunca**. `.env` está ignorado
> por git; `.env.example` documenta la forma con placeholders.

## Fases de la entrega

1. **Diseño sin IA** — los seis documentos de diseño, antes de configurar y programar.
   Marca en el historial: commit + tag **`class-04-design`**.
2. **Configuración** — proyecto Supabase individual, Session pooler (5432), `.env`, `db:check`
   exitoso, migraciones `001` y `002` en el SQL Editor.
3. **Implementación** — store SQL parametrizado, pool compartido, mapper, service, transacción
   con rollback, historial y los cinco endpoints.
4. **IA con frontera** — la IA revisa **después** de la marca; no cambia esquema/contrato/reglas
   en silencio. Todo se registra en `ai-usage.md`.
5. **Decisión técnica** — `project/docs/decisions/002-preserve-status-history.md`.
6. **Demostración** — matriz ejecutada: persistencia tras reinicio y rollback demostrado;
   reflexión (12 preguntas).

## Estado de la entrega

* [x] Fase 1 — diseño completo, marcado con `class-04-design`
* [ ] Fase 2 — proyecto Supabase propio + `db:check` exitoso + migraciones ejecutadas
* [ ] Fase 3 — store SQL, transacción, historial y endpoints funcionando
* [ ] Fase 4 — uso de IA registrado en `ai-usage.md`
* [ ] Fase 5 — decisión `002-preserve-status-history.md` escrita
* [ ] Fase 6 — matriz ejecutada (persistencia y rollback demostrados) + reflexión
* [ ] Tag `class-04-submission` con push

## Decisiones que tomé y por qué

- **La base protege la integridad estructural** (`NOT NULL`, `CHECK`, `FK`, IDENTITY); **la
  aplicación sigue protegiendo el proceso** (transiciones, terminales, estado inicial) porque un
  `CHECK` no puede comparar el valor nuevo contra el anterior.
- **`previous_status` admite NULL** por una razón del dominio: el nacimiento (`NULL → open`) no
  viene de ningún estado anterior. NULL con significado documentado es diseño.
- **Sin `DELETE`** (decisión 001 vigente): las solicitudes se cancelan con una transición,
  preservando la historia.
- **La creación también es una unidad transaccional**: la solicitud y su primer evento de
  historia nacen juntos o no nacen.
- **El contrato HTTP no cambia**: los cinco endpoints y el formato de error `{code, message}`
  sobreviven intactos a que cambie todo el almacenamiento. Solo aparece **uno nuevo**:
  `GET /requests/:id/history`.

## Entrega

- Marca intermedia: `class-04-design`
- Tag final: `class-04-submission`
