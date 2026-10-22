# Responsibility map — Clase 08

Mapa de responsabilidades del handler cargado, hecho **ANTES** de refactorizar.
Analizado leyendo `GET /:id/history` en `src/modules/requests/requests.routes.js`
(líneas 31-116 del starter).

## El handler analizado

Ruta/operación: `GET /requests/:id/history`

Estado inicial: funciona y todas las pruebas pasan, pero mezcla cinco
responsabilidades en una sola función. Ese es exactamente el problema de la
semana: **no falla, pero no se puede cambiar con confianza.**

## Clasificación de bloques

| Categoría | ¿Qué hace ese bloque aquí? | ¿A qué archivo debería moverse? |
| --- | --- | --- |
| HTTP (leer params/identidad) | Lee `req.params.id`, valida el formato con un regex **escrito a mano** (duplicando `parseIdParam`) y lanza `INVALID_REQUEST_ID` (líneas 39-45). También lee `req.auth.role` y `req.auth.userId`. | Se queda en la route, pero delegando en `parseIdParam` de `src/http/parse-id.js` en vez de repetir el regex. |
| Aplicación (coordinar el caso) | No existe como bloque: la coordinación está *disuelta* entre las consultas y las reglas. Nadie "orquesta": el handler hace de todo, en orden, de arriba abajo. | Nueva función `getHistory(actor, id)` en `requests.service.js`. |
| Negocio (¿puede verse?) | `isAgent`, `isOwner` y el `throw REQUEST_NOT_FOUND` cuando no es ninguno (líneas 58-64): es la regla de visibilidad de la clase 05, **reescrita a mano**. | `canViewHistory` de `request.policy.js` (que ya existe y hoy nadie usa aquí). |
| Persistencia (SQL) | Dos consultas SQL crudas con `pool.query`: la solicitud (líneas 48-52) y el historial (líneas 67-73). Además monta a mano `SELECT id, title, ...` (duplica `REQUEST_COLUMNS`). | `requests.store.js`: `findById` (ya existe) y `findHistory` (ya existe). |
| Presentación (construir respuesta) | Reconstruye el `map` de eventos con el `if (priority_changed)` (líneas 76-96): es **copia literal** de `mapHistoryEventRow`. | `request.mapper.js`: `mapHistoryEventRow` (ya existe). |
| Observabilidad (errores/requestId) | Ninguna explícita: los `throw` viajan al error handler central de la clase 07, que añade `requestId`. | Se queda como está: el handler central es el único punto (clase 07). El handler cargado no debe romperlo. |

## Las preguntas del análisis

* **¿Cuántas RAZONES distintas tiene esta función para cambiar?**
  Cinco, una por responsabilidad:
  1. **HTTP**: si cambia el formato válido de `:id` o el nombre del parámetro.
  2. **Coordinación**: si el caso de uso "ver historial" gana un paso (p. ej. paginación).
  3. **Negocio**: si cambia la regla de visibilidad (p. ej. un agente externo también ve).
  4. **Persistencia**: si cambia el esquema (`request_history` gana una columna) o el `ORDER BY`.
  5. **Presentación**: si el contrato del evento cambia (p. ej. exponer `changedBy`).
  Cinco razones de cambio en un archivo que *debería* cambiar por una sola cosa
  (traducir HTTP) es la definición de baja cohesión.

* **¿Qué piezas ya existentes del proyecto duplica? (pista: mira store, mapper y policy)**
  - El **regex + `Number()`** de `parseIdParam` (`src/http/parse-id.js`) → duplicado en las líneas 41-45.
  - La **lista de columnas** `REQUEST_COLUMNS` y la consulta `findById` (`requests.store.js`).
  - La consulta `findHistory` (`requests.store.js`) → duplicada en las líneas 67-73.
  - El `map` de eventos, que es **idéntico** a `mapHistoryEventRow` (`request.mapper.js`).
  - La regla de visibilidad `isAgent || isOwner`, que ya vive en `canViewHistory` (`request.policy.js`).
  Es la señal clásica: cuando un handler copia piezas que ya existen en las
  capas correctas, la lógica se bifurca y cualquier cambio hay que hacerlo **dos veces**.

* **¿Qué NO se puede probar de forma aislada mientras todo viva junto?**
  - La **regla de visibilidad**: hoy solo se puede comprobar con HTTP + PostgreSQL reales, porque está enterrada dentro del handler. En `canViewHistory` se probaría con objetos planos, en milisegundos.
  - La **forma del evento mapeado**: hoy exige una base de datos para verificar que `priority_changed` expone `fromPriority` y no `fromStatus`.
  - El **formato del id**: hoy exige levantar el servidor; `parseIdParam` ya se puede probar como función pura.
  Mientras todo vive junto, la única prueba posible es la de integración: lenta,
  con base de datos, y que falla por cinco motivos distintos a la vez.

## Conclusión del análisis

El handler tiene **cinco razones para cambiar** y **duplica cinco piezas** que
ya existen. El refactor NO inventa capas nuevas: **reconecta** el handler con
`parseIdParam`, `findById` + `findHistory`, `canViewHistory` y
`mapHistoryEventRow`, y mueve la coordinación a un `getHistory` en el service.
El contrato observable (ruta, status, body, permisos) **no cambia**.
