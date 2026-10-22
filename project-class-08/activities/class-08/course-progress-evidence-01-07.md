# course-progress-evidence-01-07

Paquete de evidencia para el diagnóstico acumulativo 7 en 1.
Generado automáticamente — completa las secciones marcadas con [COMPLETAR] antes de ejecutar el prompt.

## Metadata

* studentId: [COMPLETAR — tu identificador de estudiante, sin datos personales extra]
* promptVersion: ITSU-CHECKPOINT-01-07-1.0
* rubricVersion: BACKEND-01-07-R1
* generatedAt: 2026-10-22T01:46:29.880Z (EXECUTED_NOW)
* repoRoot: backend-course
* commit: 70b2205 (EXECUTED_NOW)
* repositorioRemoto: https://github.com/abrahammedinaitsu/backend-course.git (EXECUTED_NOW) — verifica que sea TU repositorio antes de continuar
* modeloUtilizado: [COMPLETAR después de ejecutar el prompt]

### Contexto de git (informativo, EXECUTED_NOW)

El curso se trabaja en computadoras compartidas: el historial local puede
estar incompleto o pertenecer a otra sesión sin que falte trabajo real.
Este contexto NO es evidencia requerida — la evidencia son los archivos
del repositorio remoto del estudiante y sus respuestas. La ausencia de
commits aquí no debe interpretarse como evidencia faltante.

```text
70b2205 class-07-observability
a2ada39 class-07-incidents-fixed
9a3358c class-07-baseline
5b7ce95 class-06-submission
0786a25 class-06-regression-fixed
ecfb931 class-06-environment-ready
a63cfcd docs(class-05): decision log del frontend (007-010) y data-model v5
12fea5d feat(frontend): entrega 05B - El mundo de la autenticacion (/learn)
```

## Evidencia por clase

Los archivos listados existen en el repositorio (FOUND). Un archivo de salida guardado, como validation-evidence.txt, es TEXTO: demuestra que se guardó, no que se ejecutó (NOT_VERIFIED como ejecución).

### Clase 01 — Fundamentos de backend

* FOUND: activities\class-01\README.md
* FOUND: activities\class-01\evidence\class-01-journey.md
* FOUND: activities\class-01\evidence\curl-examples.md
* FOUND: activities\class-01\evidence\lab-failures-diagnosis.md
* FOUND: activities\class-01\evidence\network-notes.md
* FOUND: activities\class-01\src\01-hello-world.js
* FOUND: activities\class-01\src\02-server-progressive.js
* FOUND: activities\class-01\src\03-routes.js
* FOUND: activities\class-01\src\04-structured-server.js
* FOUND: activities\class-01\src\lab\README-lab.md
* FOUND: activities\class-01\src\lab\server-01-broken.js
* FOUND: activities\class-01\src\lab\server-01-fixed.js
* … 11 archivo(s) más con el mismo patrón

Extracto de activities\class-01\README.md (redactado automáticamente):

```text
# Actividad Clase 01 – Del clic a la respuesta: ¿qué ocurre detrás de una aplicación web?

## Objetivo

Comprender, paso a paso, qué ocurre cuando una acción del usuario (por ejemplo, "Guardar") llega a un servidor y obtiene una respuesta. 

## Estructura del entregable

```text
activities/class-01/
├── README.md
├── evidence/
│   ├── class-01-journey.md
│   ├── curl-examples.md
│   ├── network-notes.md
│   └── lab-failures-diagnosis.md
└── src/
    ├── 01-hello-world.js
    ├── 02-server-progressive.js
    ├── 03-routes.js
    ├── 04-structured-server.js
    ├── lab/
    │   ├── README-lab.md
    │   ├── server-01-broken.js
    │   ├── server-02-broken.js
    │   ├── server-03-broken.js
    │   ├── server-04-broken.js
    │   ├── server-05-broken.js
    │   ├── server-06-broken.js
    │   ├── server-01-fixed.js
[... 53 líneas más]
```

### Clase 02 — HTTP y contratos

* FOUND: activities\class-02\README.md
* FOUND: activities\class-02\ai-usage.md
* FOUND: activities\class-02\casos-de-prueba.md
* FOUND: activities\class-02\comparison.md
* FOUND: activities\class-02\lite-analysis.md
* FOUND: activities\class-02\lite-api\package-lock.json
* FOUND: activities\class-02\lite-api\package.json
* FOUND: activities\class-02\lite-api\server.js
* FOUND: activities\class-02\project\README.md
* FOUND: activities\class-02\project\docs\http-contract.md
* FOUND: activities\class-02\project\package-lock.json
* FOUND: activities\class-02\project\package.json
* … 7 archivo(s) más con el mismo patrón

Extracto de activities\class-02\project\docs\http-contract.md (redactado automáticamente):

```text
# Contrato HTTP — Request API Full

> Escrito **antes** de implementar los manejadores. El contrato es la promesa que hace la API;
> el código es la manera de cumplirla.

## Recurso

Una **solicitud** (`request`) representa un pedido de mantenimiento hecho por alguien de la
institución: algo que se debe arreglar o revisar (una proyectora, una silla, el Wi-Fi). Cada
solicitud se identifica con un `id` numérico y arranca en estado `open`.

### Forma del recurso

| Campo         | Tipo    | Obligatorio | Quién lo asigna | Notas |
| ------------- | ------- | ----------- | --------------- | ----- |
| `id`          | integer | Sí          | Servidor        | Único e incremental. El cliente no lo envía. |
| `title`       | string  | Sí          | Cliente         | No puede faltar ni estar en blanco. Se recorta con `trim()`. |
| `description` | string  | No          | Cliente         | Si no llega, queda `undefined` (se omite en el JSON). |
| `status`      | string  | Sí          | Servidor        | Siempre `"open"` al crear. El cliente no lo controla. |
| `priority`    | string  | No          | Cliente         | Sin validación de valores en este incremento. |

---

## Endpoint 1 — Listar solicitudes

| Elemento              | Valor |
| --------------------- | ----- |
| Método                | `GET` |
| Ruta                  | `/requests` |
| Entrada               | Ninguna |
[... 94 líneas más]
```

Extracto de activities\class-02\README.md (redactado automáticamente):

```text
# Actividad Clase 02 — HTTP: el contrato entre cliente y servidor

## Qué contiene esta carpeta y cómo está organizada

```txt
activities/class-02/
├── README.md                Este archivo.
├── lite-analysis.md         Análisis independiente de la API Lite (hecho ANTES de usar IA y ANTES de corregir). Tag: class-02-lite-analysis.
├── casos-de-prueba.md       Resultados observados de los casos manuales (A, B y C).
├── comparison.md            Comparación Lite vs Full + las 14 preguntas + reflexión final.
├── ai-usage.md              Registro del uso de IA (fase Full únicamente).
├── lite-api/                Request API Lite: la versión de partida, corregida en commits posteriores.
│   ├── package.json
│   └── server.js
└── project/                 Request API Full (incremento 1).
    ├── README.md
    ├── package.json
    ├── spec.txt             Especificación escrita antes del primer prompt.
    ├── docs/
    │   └── http-contract.md Contrato HTTP, escrito antes de los manejadores.
    └── src/
        ├── app.js
        ├── server.js
        ├── routes/
        │   └── requests.routes.js
        └── data/
            └── requests.js
```

Dos APIs del mismo recurso (*solicitudes de mantenimiento*), aprendidas por caminos opuestos:
[... 79 líneas más]
```

### Clase 03 — Recursos, estado y reglas

* FOUND: activities\class-03\README.md
* FOUND: activities\class-03\ai-usage.md
* FOUND: activities\class-03\http-contract.md
* FOUND: activities\class-03\reflection.md
* FOUND: activities\class-03\resource-model.md
* FOUND: activities\class-03\test-matrix.md
* FOUND: activities\class-03\transition-map.md
* FOUND: activities\class-04\test-matrix.md

Extracto de activities\class-03\resource-model.md (redactado automáticamente):

```text
# Resource model — Request

> Fase 1 · completado **antes de usar IA y antes de tocar código**.
> No toda palabra del requerimiento se convierte en ruta o campo: parte del trabajo es
> decidir qué entra, qué espera y qué se pregunta.

## Nombre del recurso

**Request** (solicitud de mantenimiento). Representa un pedido concreto de arreglo o revisión
hecho por alguien de la institución (una proyectora que no enciende, una silla rota, el Wi-Fi
que se cae). Tiene una identidad propia, un ciclo de vida y una historia que debe poder
consultarse.

## Propiedades

| Propiedad     | Tipo    | Ejemplo |
| ------------- | ------- | ------- |
| `id`          | number  | `4` |
| `title`       | string  | `"Projector does not turn on"` |
| `description` | string  | `"The projector in room 204 shows no image during class."` |
| `status`      | string  | `"open"` |
| `priority`    | string  | `"high"` |
| `createdAt`   | string (ISO 8601) | `"2026-10-21T00:20:00.000Z"` |
| `updatedAt`   | string (ISO 8601) | `"2026-10-21T00:20:00.000Z"` |

## Campos requeridos

- `title`: sin título no hay solicitud. Es el mínimo que permite identificarla en una lista.
  No puede venir ausente ni en blanco (solo espacios).

[... 47 líneas más]
```

Extracto de activities\class-03\README.md (redactado automáticamente):

```text
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
[... 18 líneas más]
```

### Clase 04 — PostgreSQL y persistencia

* FOUND: activities\class-04\README.md
* FOUND: activities\class-04\ai-usage.md
* FOUND: activities\class-04\data-model.md
* FOUND: activities\class-04\error-map.md
* FOUND: activities\class-04\persistence-contract.md
* FOUND: activities\class-04\query-matrix.md
* FOUND: activities\class-04\reflection.md
* FOUND: activities\class-04\test-matrix.md
* FOUND: activities\class-04\transaction-plan.md
* FOUND: project-class-06\scripts\seed.js
* FOUND: project-class-07\scripts\seed.js
* FOUND: project-class-08\scripts\seed.js

Extracto de activities\class-04\README.md (redactado automáticamente):

```text
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
[... 53 líneas más]
```

### Clase 05 — Autenticación y autorización

* FOUND: activities\class-05\README.md
* FOUND: activities\class-05\access-matrix.md
* FOUND: activities\class-05\ai-usage.md
* FOUND: activities\class-05\auth-contract.md
* FOUND: activities\class-05\decision-log.md
* FOUND: activities\class-05\reflection.md
* FOUND: activities\class-05\threat-cases.md
* FOUND: activities\class-05\validation-evidence.md — salida guardada, NOT_VERIFIED como ejecución
* FOUND: project\activities\class-05\README.md
* FOUND: project\activities\class-05\access-matrix.md
* FOUND: project\activities\class-05\ai-usage.md
* FOUND: project\activities\class-05\auth-contract.md
* … 5 archivo(s) más con el mismo patrón

Extracto de activities\class-05\auth-contract.md (redactado automáticamente):

```text
# Contrato de autenticación — Request API v5

Cada endpoint es una ficha. La respuesta de éxito se escribe **completa**, con todos sus campos.

---

## POST /auth/register

| Campo | Decisión |
| ----- | -------- |
| ¿Público o protegido? | **Público** (no exige token: es el endpoint que crea la identidad) |
| Campos permitidos en el body | `email`, `password` — nada más |
| Campos que producen rechazo explícito | `role`, `id`, `createdAt`, `updatedAt`, `createdBy`, `passwordHash` |
| Reglas del email | Requerido, formato básico (`algo@algo.algo`), se **normaliza** (trim + minúsculas) ANTES de guardar |
| Reglas de la password | String de **15 a 128** caracteres (por puntos de código; Unicode y espacios permitidos, sin reglas de composición) |

Respuesta de éxito (código + body con TODOS sus campos):

```http
201 Created

{ "id": "0b6f2c1e-8a44-4d5f-9c1a-7e2b3d4f5a60", "email": "ana@example.com", "role": "requester", "createdAt": "2026-10-21T12:00:00.000Z" }
```

Errores:

| Situación | HTTP | error.code |
| --------- | ---- | ---------- |
| Campo controlado por el servidor en el body | 400 | `SERVER_CONTROLLED_FIELD` |
| Email inválido (falta, vacío o mal formado) | 400 | `INVALID_EMAIL` |
[... 68 líneas más]
```

Extracto de activities\class-05\validation-evidence.md (redactado automáticamente):

```text
# Evidencia de validación — Clase 05

Salida del validador del taller al cerrar cada estación. **Sin secretos** (el validador ya evita
imprimirlos; no agregué capturas del `.env`). El validador es la **especificación ejecutable**:
se corre sobre HTTP y solo toca PostgreSQL para verificar, promover un usuario sintético y limpiar.

Cómo se ejecuta:

```bash
npm run validate:class-05 -- --stage <nombre>
npm run validate:class-05        # boss battle integral (12 checks)
```

## stage setup

```txt
CLASS 05 VALIDATION — stage: setup

✓ Database connection
✓ Previous schema
✓ Authentication migrations
✓ Existing request endpoints
✓ No committed secrets

RESULT: 5/5
```

## stage access-design

```txt
[... 169 líneas más]
```

### Clase 06 — Onboarding y pruebas

* FOUND: project-class-06\.gitignore
* FOUND: project-class-06\README.md
* FOUND: project-class-06\activities\class-06\README.md
* FOUND: project-class-06\activities\class-06\validation-evidence.txt — salida guardada, NOT_VERIFIED como ejecución
* FOUND: project-class-06\activities\class-06\work-log.md
* FOUND: project-class-06\database\migrations\001_create_users.sql
* FOUND: project-class-06\database\migrations\002_create_requests.sql
* FOUND: project-class-06\database\migrations\003_create_request_history.sql
* FOUND: project-class-06\database\migrations\004_add_constraints_and_indexes.sql
* FOUND: project-class-06\package-lock.json
* FOUND: project-class-06\package.json
* FOUND: project-class-06\recovery\README.md
* … 41 archivo(s) más con el mismo patrón

Extracto de project-class-06\activities\class-06\work-log.md (redactado automáticamente):

```text
# Class 06 work log — Mi primer ticket en un backend existente

**Taller:** onboarding · **Entrega:** 06 · **Entorno:** Node v24.16.0 · npm 11 · PostgreSQL (Supabase) · `node:test` + `supertest`

Este documento responde las preguntas de la bitácora del taller con mis propias
palabras y registra **qué hice, cómo lo verifiqué y por qué**. No es un resumen
de teoría: es la historia del trabajo sobre un backend que no escribí.

---

## Entorno

**¿Qué configuré?**

El taller pide partir de una base de datos propia y sin configurar. Usé el
mismo proyecto Supabase de las clases anteriores, pero **aislé el taller en su
propio esquema de PostgreSQL (`class06`)** para que sus tablas
(`users`, `requests`, `request_history`) no chocaran con las de la clase 05
(`users`, `requests`, `request_status_history`) que viven en `public`.

- `DESIGN`: no toqué las tablas de la clase 05. El taller vive en `class06`.
- `.env` (NO versionado): `DATABASE_URL` apunta al esquema con
  `?options=--search_path%3Dclass06`, `JWT_SECRET` **generado** con
  `npm run generate:secret` (no inventado a mano), `PORT=3001` para no colisionar
  con el backend de la clase 05 (puerto 3000).
- `.env.example` SÍ se versiona: documenta QUÉ configurar sin exponer valores.

**¿Qué comando confirmó que funcionó?**

`npm run class-06:doctor` → **`Environment ready.`** (10/10 marcas PASS:
[... 280 líneas más]
```

Extracto de project-class-06\activities\class-06\validation-evidence.txt (redactado automáticamente):

```text
Salida real de: npm run validate:class-06
(no contiene secretos; no se incluye ninguna captura del .env)

$ npm run validate:class-06

CLASS 06 FINAL VALIDATION

Environment
[01/12] Database is reachable .............. PASS
[02/12] Migrations are complete ............ PASS
[03/12] Seed data is available ............. PASS

Regression
[04/12] Valid empty collection returns 200 .. PASS
[05/12] Empty collection returns [] ........ PASS

History endpoint
[06/12] Authentication is required ......... PASS
[07/12] Owner can read history ............. PASS
[08/12] Stranger cannot read history ....... PASS
[09/12] Agent can read history ............. PASS
[10/12] Missing request returns 404 ........ PASS
[11/12] Events are ordered correctly ....... PASS
[12/12] Sensitive information is hidden .... PASS

Cleanup
Temporary validation data removed successfully.

FINAL RESULT: PASSED

[... 10 líneas más]
```

### Clase 07 — Diagnóstico y errores

* FOUND: project-class-07\.gitignore
* FOUND: project-class-07\README.md
* FOUND: project-class-07\activities\class-07\README.md
* FOUND: project-class-07\activities\class-07\incident-report.md
* FOUND: project-class-07\activities\class-07\validation-evidence.txt — salida guardada, NOT_VERIFIED como ejecución
* FOUND: project-class-07\database\migrations\001_create_users.sql
* FOUND: project-class-07\database\migrations\002_create_requests.sql
* FOUND: project-class-07\database\migrations\003_create_request_history.sql
* FOUND: project-class-07\database\migrations\004_add_constraints_and_indexes.sql
* FOUND: project-class-07\incidents\INC-701-invalid-request-id.md
* FOUND: project-class-07\incidents\INC-702-invalid-priority.md
* FOUND: project-class-07\incidents\OPS-703-untraceable-errors.md
* … 52 archivo(s) más con el mismo patrón

Extracto de project-class-07\activities\class-07\incident-report.md (redactado automáticamente):

```text
# Class 07 incident report

Completado **mientras** investigaba cada incidente. Separo hechos (Evidence)
de interpretaciones (Hypotheses): un "creo que" nunca va en Evidence.

Identidad de la guardia:
- Proyecto: `project-class-07/` (deriva de la solución de la clase 06, con defectos deliberados).
- Base: **la misma de la clase 06** (esquema `class06` de Supabase). Migraciones en `SKIPPED`.
- Node v24.16.0 · `node:test` + Supertest · Express 5.

---

## Baseline

**¿Qué comando confirmó el estado inicial?**

`npm run class-07:doctor` → **`Environment ready for incident response.`** (7/7 PASS).

Luego, la secuencia completa de baseline, ANTES de tocar cualquier código:

- `npm run db:migrate` → las 4 migraciones en **`[SKIPPED]`** + "No pending migrations." → confirma que reuso la base de la clase 06, no creé nada nuevo.
- `npm run db:seed` → 3 usuarios, 6 solicitudes, 15 eventos.
- `npm test` → **20 pass, 17 todo, 0 fail**. Los 17 `todo` son intencionales: son los huecos que llenaría con las pruebas de regresión.

Punto de comparación común: el commit inicial quedó en `class-07-baseline`. Sin la suite verde inicial no podría distinguir "lo rompí yo" de "ya estaba roto".

---

## Incident 701

[... 358 líneas más]
```

Extracto de project-class-07\activities\class-07\validation-evidence.txt (redactado automáticamente):

```text
Salida real de: npm run validate:class-07
(no contiene secretos; no se incluye ninguna captura del .env ni tokens)

$ npm run validate:class-07

CLASS 07 INCIDENT VALIDATION

Baseline
[01/12] Existing contract preserved .......... PASS

Input and errors
[02/12] Invalid id returns 400 ............... PASS
[03/12] Invalid priority returns 400 ......... PASS
[04/12] Unknown request returns 404 .......... PASS
[05/12] Invalid transition returns 409 ....... PASS
[06/12] Unexpected errors return 500 ......... PASS
[07/12] Internal details remain hidden ....... PASS

Traceability
[08/12] Response contains request id ......... PASS
[09/12] Log contains the same request id ..... PASS
[10/12] Authorization header is not logged ... PASS

Operation
[11/12] Health endpoint responds ............. PASS
[12/12] Readiness checks PostgreSQL .......... PASS

Cleanup
Temporary validation data removed successfully.

[... 13 líneas más]
```

## Estado previo a la clase 8

* Validadores disponibles (clases 1-7): project-class-06\scripts\validate-class-06.js, project-class-07\scripts\validate-class-06.js, project-class-07\scripts\validate-class-07.js, project-class-08\scripts\validate-class-06.js, project-class-08\scripts\validate-class-07.js, project\scripts\validate-class-05.js
* Carpetas de pruebas: NOT_FOUND
* Último commit antes del taller: 70b2205

## Cuestionario diagnóstico (responde aquí, 3-6 líneas cada una)

Sé específico: cita archivos o rutas concretas de TU proyecto cuando puedas. La extensión no suma.

### Pregunta clase 01

Describe qué ocurre desde que una petición llega al backend hasta que sale una respuesta y explica por qué el servidor debe permanecer activo.

Respuesta: [COMPLETAR]

### Pregunta clase 02

Elige un endpoint del proyecto y explica cómo método, ruta, body y status forman su contrato.

Respuesta: [COMPLETAR]

### Pregunta clase 03

Explica, usando una solicitud del proyecto, la diferencia entre representación, dato inválido y transición incompatible con el estado actual.

Respuesta: [COMPLETAR]

### Pregunta clase 04

Explica la diferencia entre migración, seed y transacción, e indica dónde aparece cada concepto en el proyecto.

Respuesta: [COMPLETAR]

### Pregunta clase 05

Explica la diferencia entre autenticación y autorización y por qué un JWT decodificado todavía debe verificarse.

Respuesta: [COMPLETAR]

### Pregunta clase 06

Elige una prueba del proyecto, identifica preparación, acción y comprobación, y explica qué regresión protege.

Respuesta: [COMPLETAR]

### Pregunta clase 07

Describe un fallo investigado distinguiendo síntoma, hipótesis y causa; luego indica qué señal correspondería a health o readiness.

Respuesta: [COMPLETAR]

---
Nota de seguridad: este paquete fue generado excluyendo .env y redactando
posibles secretos. Revisa una vez más antes de pegarlo en un modelo:
si ves una credencial real, reemplázala por [REDACTED] y avisa al docente.
