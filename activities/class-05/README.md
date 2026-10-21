# Actividades — Clase 05

Taller autodirigido: convertir la API abierta de la clase 04 en una API **con identidad**
(autenticación, propiedad, permisos y auditoría), y luego dos entregas de frontend.

## El orden importa

El taller empieza **escribiendo, no programando**. Cada documento es una decisión que el código
después solo obedece.

1. `access-matrix.md` — quién puede hacer qué (estación 1). **Antes que cualquier código.**
2. `auth-contract.md` — el contrato de los endpoints de auth (estación 1).
3. `threat-cases.md` — los ataques que la implementación deberá resistir (estación 1).
4. `decision-log.md` — cada decisión no obvia, cuando la tomo.
5. `validation-evidence.md` — la salida del validador por estación (sin secretos).
6. `ai-usage.md` — solo puede tener contenido DESPUÉS del checkpoint.
7. `reflection.md` — al cierre del taller.

## Checkpoint `class-05-access-design`

La IA **no puede usarse** hasta que pase:

```bash
npm run validate:class-05 -- --stage access-design
```

En este repositorio el checkpoint pasó (`3/3`: matriz, contrato y amenazas completos) **antes**
de escribir código de autenticación, y quedó registrado en `validation-evidence.md`.

## Resultado del taller

Estado de las estaciones (detalle en `validation-evidence.md`):

| Estación | Qué hace | Resultado |
| -------- | -------- | --------- |
| setup | base conectada, migraciones 003–005, secreto, cero secretos en Git | `5/5` |
| access-design | matriz + contrato + amenazas | `3/3` |
| register | `POST /auth/register` con allowlist y rol impuesto | `2/2` |
| password | hash scrypt, nunca texto plano | `1/1` |
| login | contrato de login + claims y vida del JWT | `2/2` |
| authentication | rutas protegidas + verificación de token | `2/2` |
| ownership | propiedad confiable + aislamiento del requester | `2/2` |
| authorization | permisos del agent + reglas de estado | `2/2` |
| **boss battle** | integral, **dos veces seguidas** | **`12/12`** |

## Dónde vive este directorio

El validador (`project/scripts/validate-class-05.js`) busca estos documentos en
`project/activities/class-05/`. Este directorio del repositorio (`activities/class-05/`, junto a
las demás clases) es la **copia de registro** de la entrega; el contenido es el mismo.

## Entregables de frontend (misma clase, semanas siguientes)

- **05A** → `frontend/app/` — interfaz real que consume esta API (auth, roles, estados de UI).
- **05B** → `frontend/learn/` — documentación interactiva «El mundo de la autenticación».
