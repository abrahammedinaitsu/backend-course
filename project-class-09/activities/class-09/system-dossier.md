# System dossier

Un solo expediente para todo el análisis del taller. Regla de oro: cada
afirmación cita su evidencia (archivo y función, prueba, tabla o salida de
comando) o se declara como duda en la sección 9. "El service maneja la
lógica" sin nombres no cuenta como inventario.

## 1. How the system starts

[COMPLETAR — comando de arranque, archivo que ejecuta Node, qué construye
la aplicación y qué queda escuchando. Evidencia: archivos y líneas.]

## 2. Main components

| Componente | Archivo o recurso | Responsabilidad | Evidencia | Duda |
| --- | --- | --- | --- | --- |
| Punto de entrada | [COMPLETAR] | | | |
| Construcción de la app | | | | |
| Router principal | | | | |
| Módulos | | | | |
| Middleware global | | | | |
| Autenticación | | | | |
| Autorización (policies) | | | | |
| Services | | | | |
| Stores / acceso a datos | | | | |
| Conexión PostgreSQL | | | | |
| Manejo de errores | | | | |
| Logging | | | | |
| Health / readiness | | | | |
| Pruebas | | | | |
| Scripts operativos | | | | |
| Dependencias externas | | | | |

## 3. Request trace

Recorrido completo de `GET /requests/:id` — en orden, con archivo y
función en cada paso:

1. Router: [COMPLETAR]
2. Middlewares que atraviesa: [COMPLETAR]
3. Dónde se valida el parámetro `id`: [COMPLETAR]
4. Dónde nace la identidad autenticada: [COMPLETAR]
5. Policy consultada (¿se consulta?): [COMPLETAR]
6. Service: [COMPLETAR]
7. Store y query: [COMPLETAR]
8. Transformación fila → JSON: [COMPLETAR]
9. Respuesta y manejo de errores: [COMPLETAR]
10. Pruebas existentes que cubren este recorrido: [COMPLETAR]

## 4. Database inventory

[COMPLETAR — tablas principales, claves y restricciones relevantes,
migraciones que las crearon, cómo se siembra. Evidencia: archivos SQL.]

## 5. Authentication and authorization

[COMPLETAR — dónde se verifica el JWT, qué contiene req.auth, dónde viven
las reglas de permiso, un ejemplo de regla y su prueba.]

## 6. Errors, logs and operational checks

[COMPLETAR — formato de error y requestId, qué se registra en logs y qué
jamás, diferencia entre /health y /ready con evidencia.]

## 7. Minimum-practices audit

Clasificaciones permitidas: COMPLIES · PARTIAL · DOES_NOT_COMPLY ·
NOT_FOUND · NOT_UNDERSTOOD. Cada fila cita evidencia o reconoce duda.

| Área | Pregunta | Clasificación | Evidencia / duda |
| --- | --- | --- | --- |
| Configuración | ¿Los secretos están fuera del código? | [COMPLETAR] | |
| Entrada | ¿Se validan datos externos? | | |
| SQL | ¿Las consultas están parametrizadas? | | |
| Identidad | ¿El JWT se verifica? | | |
| Permisos | ¿Existe autorización además de autenticación? | | |
| Ownership | ¿Se limita el acceso al propietario cuando corresponde? | | |
| Dominio | ¿Los campos del servidor están protegidos? | | |
| Consistencia | ¿Las escrituras relacionadas usan transacción? | | |
| Errores | ¿Existe un formato consistente? | | |
| Logs | ¿Ayudan a investigar sin exponer secretos? | | |
| Pruebas | ¿Existen casos positivos y negativos? | | |
| Migraciones | ¿El esquema está versionado? | | |
| Seed | ¿Puede repetirse de forma controlada? | | |
| Arquitectura | ¿HTTP, reglas y SQL están separados razonablemente? | | |
| Operación | ¿Health y readiness tienen propósitos distintos? | | |

## 8. Change impact

Completa ANTES de modificar código. Commit: `class-09-analysis`.

### Observable behavior

[COMPLETAR — qué comportamiento observable cambia (el 404 del ajeno) y
cuál NO debe cambiar.]

### Files likely affected

[COMPLETAR]

### Rule to protect

[COMPLETAR — la regla de negocio, en una frase.]

### Data required

[COMPLETAR — qué datos necesita la regla para decidir (rol, createdBy…).]

### Status codes

[COMPLETAR — tabla de casos y códigos, incluida la decisión 404.]

### Tests to add or change

[COMPLETAR]

### Behavior that must remain unchanged

[COMPLETAR — owner, agent, schema, endpoints vecinos.]

### Risks

[COMPLETAR]

### Unknowns

[COMPLETAR]

## 9. Unknowns and questions

[COMPLETAR — lo que todavía no entiendes del sistema, como preguntas
concretas. Esta sección NUNCA debe quedar vacía: un junior sin dudas no
ha mirado suficiente.]
