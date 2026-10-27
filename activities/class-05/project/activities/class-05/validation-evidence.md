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
CLASS 05 VALIDATION — stage: access-design

[01/03] access-matrix.md completed ....... PASS
[02/03] auth-contract.md completed ....... PASS
[03/03] threat-cases.md completed ........ PASS

RESULT: 3/3

Checkpoint class-05-access-design reached.
Your access design is on record — AI assistance is now allowed.
```

## stage register

```txt
CLASS 05 VALIDATION — stage: register

[01/02] Public registration .............. PASS
[02/02] Role escalation protection ....... PASS

RESULT: 2/2
```

## stage password

```txt
CLASS 05 VALIDATION — stage: password

[01/01] Password storage ................. PASS

RESULT: 1/1
```

## stage login

```txt
CLASS 05 VALIDATION — stage: login

[01/02] Login contract ................... PASS
[02/02] JWT claims and lifetime .......... PASS

RESULT: 2/2
```

## stage authentication

```txt
CLASS 05 VALIDATION — stage: authentication

[01/02] Protected endpoints .............. PASS
[02/02] Token verification ............... PASS

RESULT: 2/2
```

## stage ownership

```txt
CLASS 05 VALIDATION — stage: ownership

[01/02] Trusted request ownership ........ PASS
[02/02] Requester isolation .............. PASS

RESULT: 2/2
```

## stage authorization

```txt
CLASS 05 VALIDATION — stage: authorization

[01/02] Agent permissions ................ PASS
[02/02] Status rules preserved ........... PASS

RESULT: 2/2
```

## Boss battle (integral)

Corrido **dos veces seguidas** (idempotencia y limpieza). Ambas idénticas:

```txt
CLASS 05 VALIDATION

[01/12] Database and migrations .......... PASS
[02/12] Public registration .............. PASS
[03/12] Role escalation protection ....... PASS
[04/12] Password storage ................. PASS
[05/12] Login contract ................... PASS
[06/12] JWT verification ................. PASS
[07/12] Protected endpoints .............. PASS
[08/12] Trusted request ownership ........ PASS
[09/12] Requester isolation .............. PASS
[10/12] Agent permissions ................ PASS
[11/12] Status rules preserved ........... PASS
[12/12] Sensitive data protection ........ PASS

RESULT: 12/12
CLASS 05 COMPLETED
```

## Evidencia HTTP complementaria (curl real, sin secretos)

Además del validador, verifiqué a mano los flujos clave con `curl`. Extractos (la salida completa
está abajo como referencia):

```txt
# Escalamiento de rol rechazado explícito
POST /auth/register  { "email": "...", "password": "...", "role": "agent" }
-> 400 { "error": { "code": "SERVER_CONTROLLED_FIELD", "message": "The field \"role\" is controlled by the server and cannot be sent." } }

# createdBy fabricado
POST /requests  { "title": "forged", "createdBy": "0000..." }
-> 400 SERVER_CONTROLLED_FIELD

# status en la creación
POST /requests  { "title": "born closed", "status": "closed" }
-> 400 SERVER_CONTROLLED_FIELD

# Sin token / Basic / Bearer vacío
GET /requests               -> 401 AUTHENTICATION_REQUIRED
GET /auth/me (Basic ...)    -> 401 AUTHENTICATION_REQUIRED

# Body mixto: título permitido + prioridad prohibida (nada cambia)
PATCH /requests/15  { "title": "sneaky", "priority": "low" }
-> 403 FORBIDDEN
GET /requests/15    -> title SIN cambios ("Projector fails in room 204")

# IDOR: mismo 404 que un id inexistente
GET /requests/16 (ajena)   -> 404 REQUEST_NOT_FOUND
GET /requests/999999       -> 404 REQUEST_NOT_FOUND

# Agent: transición inválida y válida
PATCH /requests/16  { "status": "closed" }        -> 409 INVALID_STATUS_TRANSITION
PATCH /requests/16  { "status": "in_progress" }   -> 200

# El historial registra al actor (changedBy del token)
GET /requests/16/history
-> [ { "previousStatus": null,  "newStatus": "open",        "changedBy": "<bob>" },
     { "previousStatus": "open","newStatus": "in_progress", "changedBy": "<agent>" } ]
```

### Aislamiento de colecciones (SQL, no JavaScript)

```txt
# Colección de Ana (requester): solo lo suyo
GET /requests (Ana)   -> ids: [15]

# Colección del agent: todo, incluidas las heredadas
GET /requests (agent) -> ids: [1, 2, 3, 15, 16]
```

### CORS (entrega 05A)

```txt
# Origen permitido: cabeceras presentes
OPTIONS /requests  Origin: http://localhost:5173
-> 204 + Access-Control-Allow-Origin: http://localhost:5173
         Access-Control-Allow-Headers: Content-Type, Authorization
         Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS

# Origen NO permitido: 204 sin cabeceras CORS
OPTIONS /requests  Origin: http://evil.example
-> 204 (sin Access-Control-Allow-Origin)
```

Los datos de demostración usados en el curl se eliminaron al terminar (la base quedó en el
estado del seed: 3 solicitudes del taller y 0 usuarios).
