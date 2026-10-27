# Request Frontend — entregas 05A y 05B

Un solo proyecto Vite con **dos páginas** que crecen durante dos semanas:

```txt
frontend/
├── app/      → entrega 05A: la interfaz que consume la API REAL de la clase 05
├── learn/    → entrega 05B: «El mundo de la autenticación» (documentación interactiva)
└── index.html → portada con enlaces a /app y /learn
```

## Arranque

```bash
Set-Location .\activities\class-05\frontend
npm install
copy .env.example .env      # Windows (o `cp` en Linux/macOS)
# editar .env: VITE_API_URL apuntando a TU backend
npm run dev                 # http://localhost:5173
```

En el backend (`activities/class-05/project/.env`) debe estar:

```env
FRONTEND_ORIGIN=http://localhost:5173
```

Es el **origen EXACTO** de este frontend: el backend solo agrega las cabeceras CORS a ese
origen (verificado con `curl`: `http://evil.example` no recibe cabeceras).

Rutas del dev server:

- `http://localhost:5173/app/` — entrega 05A
- `http://localhost:5173/learn/` — entrega 05B

## Build

```bash
npm run build     # genera dist/ (multi-página: index, app/index, learn/index)
npm run preview   # sirve dist/ localmente
```

`dist/` está ignorado por git. **Nunca** se publica `dist/` con cuentas reales, tokens ni URLs
privadas.

---

# Entrega 05A — interfaz para la API

Consume **la API real** (auth, propiedad y permisos funcionando). **No hay mocks.** Ocultar un
botón solo evita ofrecer acciones que sabemos que fallarán: el backend decide de nuevo y sus
`403`/`404`/`409` se muestran cuando ocurren.

## Arquitectura (módulos pequeños, una responsabilidad cada uno)

| Archivo | Hace | No hace |
| ------- | ---- | ------- |
| `app/api.js` | Único lugar que toca `fetch`; separa "contrato" de "no hay backend" | No guarda el token |
| `app/errors.js` | `(status, body)` → mensaje claro y accionable | No habla con la red |
| `app/domain.js` | Estados, transiciones y **espejo** de autorización para la UI | No autoriza de verdad |
| `app/session.js` | Token y usuario actual (en memoria); register/login/logout | No pinta nada |
| `app/requests-api.js` | Endpoints REALES de `/requests` | No inventa rutas ni campos |
| `app/ui.js` | Construcción segura de DOM (`textContent`, nunca `innerHTML`) | No decide lógica |
| `app/main.js` | Orquesta pantallas, filtros, detalle, historial y estados | — |

## La decisión del token (documentada)

**El token vive SOLO en memoria** (`app/session.js`), no en `localStorage` ni `sessionStorage`.

- **Costo:** se pierde al recargar la página; el usuario vuelve a entrar. Es una limitación
  **honesta**, no un bug.
- **Razón:** no hay nada persistido que un XSS pueda cosechar en un descuido posterior.
  `localStorage` es accesible por cualquier script del mismo origen, así que un XSS lo lee.
  `localStorage` **no** es la solución universal: es una opción con costos. La elegiríamos solo si
  la comodidad de «seguir logueado» valiera ese riesgo — aquí no lo vale para una demo educativa.
- **Logout:** local. El JWT sigue siendo válido en el servidor hasta que expira; este backend no
  tiene revocación (es una de las fronteras anotadas en la reflexión del taller).

## Requisitos cubiertos

- **Autenticación**: registro · login · usuario actual visible (barra de sesión con email y rol) ·
  estado de sesión · logout local · manejo del token · errores de credenciales claros.
- **Vista de requester**: crear · listar **las suyas** · filtrar por estado y prioridad · detalle ·
  historial · editar título/descripción **solo si es propia y está abierta** · no ve acciones de agent.
- **Vista de agent**: listar **todas** (incluidas las heredadas) · filtrar · detalle · historial ·
  cambiar prioridad · cambiar estado mostrando **solo las transiciones disponibles** · conflictos
  `409` visibles.
- **Estados de interfaz, todos distinguibles**: `loading` (`is-loading`) · `empty` (`is-empty`) ·
  `success` (`is-ok`) · `400` validación · `401` · `403` · `404` · `409` · `500` · `503` / red.
  Cada uno con su propio mensaje y su badge (`HTTP 403`, `sin conexión`, …).

## Matriz de escenarios probados (con la API real)

Ejecutada a mano en el navegador y contra la API (extracto; comandos reproducibles en
`activities/class-05/validation-evidence.md`).

| Rol | Acción | Resultado observado |
| --- | ------ | ------------------- |
| Anónimo | Registro en la UI | `201`; entra como **Solicitante** |
| Anónimo | Registro con `role` (cliente que no respeta el frontend) | `400 SERVER_CONTROLLED_FIELD` |
| Anónimo | Login con password mala | `401 INVALID_CREDENTIALS` (mensaje claro) |
| Requester | Crear solicitud | `201`; aparece en «Mis solicitudes» (estado `success`) |
| Requester | Listar | Solo las suyas (SQL) |
| Requester | Editar título propia+abierta | `200`; título actualizado |
| Requester | PATCH prioridad | `403 FORBIDDEN` |
| Requester | PATCH estado | `403 FORBIDDEN` |
| Requester | Body mixto (título + prioridad) | `403`; **nada** cambia |
| Requester | GET solicitud ajena (IDOR) | `404 REQUEST_NOT_FOUND` (idéntico a inexistente) |
| Requester | GET historial ajeno | `404 REQUEST_NOT_FOUND` |
| Agent | Listar | **Todas** (incluidas las heredadas `createdBy: null`) |
| Agent | Cambiar prioridad | `200` |
| Agent | Estado: solo transiciones disponibles | Select ofrece `in_progress`/`cancelled` desde `open` |
| Agent | Cambiar estado | `200`; historial registra al **actor** |
| Agent | Saltar la máquina (`open → closed`) | `409 INVALID_STATUS_TRANSITION` |
| — | Backend apagado | `status 0` → mensaje «no se pudo contactar… ¿CORS?» |

## Evidencia de integración

- `dist/` se construye sin errores (`npm run build`, 6 archivos, ~15 kB de JS).
- El navegador ejecutó el flujo completo: registro → creación → listar → detalle → historial →
  edición → (logout) → login agent → cambio de estado → historial con actor.
- **Sin mocks:** todas las peticiones salen del navegador a `http://localhost:3000`.

## Cuentas de prueba (sin datos sensibles)

No se incluyen credenciales reales en el repositorio. Para probar: crea una cuenta con
**Registrarme** (nace como `requester`) y, si necesitas probar el rol agent, promueve una cuenta
sintética por SQL directo (la API **no** permite elegir rol). El validador del taller
(`activities/class-05/project/scripts/validate-class-05.js`) hace exactamente eso para sus pruebas.
