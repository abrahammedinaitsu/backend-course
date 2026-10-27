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
| Password fuera de las reglas (largo) | 400 | `INVALID_PASSWORD` |
| Email ya registrado | 409 | `ACCOUNT_CANNOT_BE_CREATED` |

> El 409 es **genérico a propósito**: `ACCOUNT_CANNOT_BE_CREATED` con el mismo mensaje no
> confirma que la cuenta exista (evita el censo de cuentas por registro).

## POST /auth/login

| Campo | Decisión |
| ----- | -------- |
| ¿Público o protegido? | **Público** (no exige token: entrega la identidad portátil) |
| Body permitido | `email`, `password` |

Respuesta de éxito (código + body: el token y sus dos acompañantes):

```http
200 OK

{ "accessToken": "<jwt de tres segmentos>", "tokenType": "Bearer", "expiresIn": 3600 }
```

Errores — las tres filas tienen EXACTAMENTE la misma respuesta.
¿Por qué? Porque **cualquier diferencia (código, mensaje o bytes) es un censo de cuentas**:
permitiría averiguar qué emails existen probando contraseñas. Una única respuesta idéntica para
todas las causas no revela nada.

| Situación | HTTP | error.code |
| --------- | ---- | ---------- |
| Email inexistente | 401 | `INVALID_CREDENTIALS` |
| Password incorrecta | 401 | `INVALID_CREDENTIALS` |
| Cuenta no disponible (cualquier otro motivo) | 401 | `INVALID_CREDENTIALS` |

## GET /auth/me

| Campo | Decisión |
| ----- | -------- |
| ¿Público o protegido? | **Protegido (Bearer)** |
| Qué devuelve | Tu propio usuario: `id`, `email`, `role` |
| Qué JAMÁS devuelve | Material de password: `password_hash`, salt, ni el hash — nunca |

Respuesta de éxito:

```http
200 OK

{ "id": "0b6f2c1e-8a44-4d5f-9c1a-7e2b3d4f5a60", "email": "ana@example.com", "role": "requester" }
```

Errores:

| Situación | HTTP | error.code |
| --------- | ---- | ---------- |
| Sin header Authorization o sin esquema Bearer | 401 | `AUTHENTICATION_REQUIRED` |
| Token inválido, alterado o expirado | 401 | `INVALID_TOKEN` |

> Un mismo `401 INVALID_TOKEN` para firma alterada, token expirado o emisor/audiencia
> equivocados: detallar **cuál** control falló le regalaría un mapa de la verificación a quien
> fabrica tokens.

## Semántica de errores (el criterio, no solo ejemplos)

| Frase | Código HTTP | ¿Cuándo lo usas en esta API? |
| ----- | ----------- | ---------------------------- |
| "No sé quién eres" | **401** | Falta el token, el esquema no es Bearer, el token no verifica (alterado/expirado), o el login falló (`INVALID_CREDENTIALS`). |
| "Sé quién eres; esto no" | **403** | Actor **identificado** cuya operación la política prohíbe: un requester cambiando prioridad/estado, un agent editando contenido, o el dueño editando una solicitud ya no abierta. |
| "Para ti, no existe" | **404** | La solicitud no existe **o** es de otro y no debes saber que existe (mismo cuerpo en ambos casos). |
| "Existe, pero choca" | **409** | Petición bien formada que choca con el estado actual: transición de estado inválida, modificar una solicitud terminal, o email duplicado al registrar. |
