# Refactor log — Clase 08

Registro del refactor seguro del handler `GET /:id/history`. Un cambio
pequeño por fila, SIEMPRE con las pruebas como red. Regla respetada: no
cambió la ruta, ni el status, ni el body, ni el permiso.

## Antes de empezar

* **Prueba(s) que protegen la operación**: `test/requests-history.test.js`
  (6 pruebas: contrato del historial, visibilidad por dueño/agente, eventos
  `status_changed` y `priority_changed`, orden por `created_at, id`).
* **Resultado de la suite ANTES del refactor**: `39 pass, 13 todo, 0 fail`
  (52 tests). Los 13 `todo` son del claim (FEATURE-801), no del historial.
* **Commit de partida** (`class-08-baseline`): `04dc625`.
* **Diff del refactor**: `src/modules/requests/requests.routes.js`
  (`-72 / +14`) y `requests.service.js` (`-2 / +19`).

## Pasos

| # | Qué extraje / moví | ¿A dónde? | Suite después (pass/fail) |
| --- | --- | --- | --- |
| 1 | La **coordinación** del caso de uso: leer la solicitud, aplicar la visibilidad, leer y mapear los eventos | Nueva función `getHistory(actor, id)` en `requests.service.js` (junto a `getRequest`) | 39 / 0 |
| 2 | El **formato del id**: el regex a mano + `Number()` que estaban dentro del handler | `parseIdParam` de `src/http/parse-id.js` (ya existía; estaba duplicado) | 39 / 0 |
| 3 | Las **dos consultas SQL** crudas (`pool.query`) con la lista de columnas copiada | `findById` + `findHistory` de `requests.store.js` (ya existían) | 39 / 0 |
| 4 | La **regla de visibilidad** `isAgent || isOwner` reescrita a mano | `canViewHistory(actor, request)` de `request.policy.js` (ya existía; delegaba en `canViewRequest`) | 39 / 0 |
| 5 | El **mapeo** de eventos (`if priority_changed`) | `mapHistoryEventRow` de `request.mapper.js` (ya existía; era copia literal) | 39 / 0 |
| 6 | La **route** reducida a traducir HTTP: `parseIdParam` + `getHistory` + `res.json` | `requests.routes.js`; se eliminan del archivo los imports de `pool` y `AppError` | 39 / 0 |
| 7 | El **comentario de cabecera** del archivo (la "excepción heredada") | `requests.routes.js` (documenta que ya no hay SQL en la route) | 39 / 0 |

> Nota de honestidad: los pasos 1-6 son UN movimiento conceptual (reconectar
> con las piezas existentes) y se aplicaron juntos; la suite se corrió varias
> veces durante el trabajo y quedó igual tras cada verificación. No hubo un
> commit intermedio con la suite roja.

## Verificación final

* **Diff revisado**: no hay cambio observable accidental. La ruta sigue siendo
  `GET /:id/history`; el status sigue siendo `200`; el body sigue siendo el
  arreglo de eventos con los mismos campos; el permiso sigue siendo
  agente-cualquiera / dueño-solo-lo-propio; un recurso ajeno sigue
  respondiendo `404 REQUEST_NOT_FOUND` (no `403`).
* **Suite completa en verde**: `39 pass, 13 todo, 0 fail` — **idéntica** al
  baseline.
* **Función pura ganada**: `canViewHistory` y `mapHistoryEventRow` ya se pueden
  probar con objetos planos, sin HTTP ni PostgreSQL.
* **Check de frontera 11 del validador**: pasa (la route ya no tiene SQL).
* **Commit del refactor**: `class-08-refactor` — `[hash]`.

## Qué preguntaste a la IA (y qué verificaste)

* **Pregunta**: "¿Estas cinco responsabilidades del handler `GET /:id/history`
  ya existen como funciones en `store`, `mapper` y `policy`? Dame el nombre
  exacto de cada una y el archivo."
* **Respuesta útil**: sí — `findById`/`findHistory` (store),
  `mapHistoryEventRow` (mapper), `canViewHistory` (policy) y `parseIdParam`
  (`http/parse-id.js`). Eso confirmó que **no hacía falta crear nada**: el
  refactor era reconectar.
* **Cómo la verifiqué**: abrí cada archivo y comprobé que el bloque a mover era
  equivalente al que ya existía (mismo `SELECT`, mismo `ORDER BY created_at, id`,
  mismo `if priority_changed`). Después corrí `test/requests-history.test.js`
  (6/6) y la suite completa (39/39) para confirmar que el comportamiento no
  cambió.

## Qué propuesta de la IA descartaste por sobrearquitectura

* La IA propuso, "para dejarlo más limpio", crear `src/modules/requests/history/`
  con su propio `history.service.js`, `history.store.js` y `history.mapper.js`,
  y un `src/domain/visibility.js` compartido, argumentando que "el historial es
  un sub-dominio".
* **La descarté**: el historial NO tiene su propio esquema ni su propio modelo
  de datos — vive en `request_history` y depende de la solicitud. Separarlo en
  su propio módulo duplicaría los mappers de solicitud y crearía tres archivos
  nuevos sin un problema presente que los justifique. El criterio del taller es
  explícito: **no crear capas que no resuelvan un problema presente**. La
  estructura mínima correcta ya existía (route/service/store/policy/status);
  solo había que **usarla**.
