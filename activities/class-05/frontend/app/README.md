# Entrega 05A — Interfaz para la API (detalle de archivos)

El README de la entrega está en `../README.md` (raíz de `activities/class-05/frontend/`). Aquí solo el mapa de archivos
de `app/` y la decisión del token, para tenerla a mano.

```txt
app/
├── index.html        → shell de la interfaz (auth + vistas de app)
├── styles.css        → estilos, con las CLASES de cada estado de interfaz
├── api.js            → único lugar que toca fetch (no guarda el token)
├── errors.js         → (status, body) → mensaje accionable y `kind`
├── domain.js         → estados/transiciones + ESPEJO de autorización (solo UI)
├── session.js        → token y usuario actual (en memoria) + register/login/logout
├── requests-api.js   → endpoints REALES de /requests
├── ui.js             → construcción segura de DOM (textContent)
├── main.js           → orquesta pantallas, filtros, detalle, historial y estados
└── ai-usage.md       → uso de IA
```

## Decisión del token

El token vive **solo en memoria** (`session.js`). Se pierde al recargar — limitación honesta — y a
cambio no hay nada persistido que un XSS coseche. `localStorage` es accesible por cualquier script
del origen, así que un XSS lo lee: se evita a propósito. Nunca se hardcodea un token.

## Estados de interfaz (todos distinguibles)

`is-loading` · `is-empty` · `is-ok` · `is-error` (con badge `HTTP 400/401/403/404/409/500/503` o
`sin conexión`). Cada uno con su propio mensaje; **no** hay un «algo salió mal» genérico.

## Regla transversal

La UI **no** es la autorización. `domain.js` solo decide qué **mostrar**; el backend decide de nuevo
y sus `403`/`404`/`409` se muestran tal cual cuando ocurren.
