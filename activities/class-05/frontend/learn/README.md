# Entrega 05B — «El mundo de la autenticación»

Documentación **interactiva** sobre identidad, credenciales y delegación. Vive en `/learn` del
mismo proyecto frontend de la entrega 05A (así lo permite la especificación, sin necesidad de
justificar un proyecto separado).

## Cómo se usa

```powershell
Set-Location .\activities\class-05\frontend
npm install
npm run dev
# abrir http://localhost:5173/learn/
```

No consume la API: es contenido estático con JavaScript propio. No necesita `VITE_API_URL` para
funcionar, aunque comparte proyecto con `/app`.

## Estructura

```txt
learn/
├── index.html        → shell mínimo (header + #learn-app + footer)
├── styles.css        → estilos (callouts por naturaleza, tablas, interactivos)
├── content.js        → los 20 contenidos + las fuentes (datos)
├── interactions.js   → las 5 interacciones significativas
├── dom.js            → helper de DOM seguro (textContent, nunca innerHTML)
├── main.js           → renderiza temas, tablas, callouts, fuentes y monta interacciones
└── ai-usage.md       → uso de IA, con lo aceptado/rechazado y errores detectados
```

## Los 20 contenidos obligatorios (todos presentes)

1. Identidad digital · 2. Autenticación · 3. Autorización · 4. Auditoría · 5. Passwords ·
6. Sesiones · 7. Cookies · 8. Bearer tokens · 9. JWT · 10. API keys · 11. OAuth 2 ·
12. OpenID Connect · 13. MFA · 14. Passkeys · 15. Proveedores de identidad ·
16. Autenticación propia frente a gestionada · 17. Riesgos comunes · 18. Casos de uso ·
19. Árbol de decisión · 20. Fuentes.

## Las cinco interacciones significativas (la entrega pide ≥ 3)

Cada una **transforma** el entendimiento; ninguna es decorativa.

| # | Dónde | Qué hace | Por qué importa |
| - | ----- | -------- | --------------- |
| 1 | Tema 9 (JWT) | **Inspector de JWT ficticio**: «Decodificar» muestra el payload legible; «Verificar» falla la firma | Separa *leer* de *confiar*; el payload es visible pero no confiable |
| 2 | Tema 6 (Sesiones) | **Comparador** de estrategias (sesión, JWT, OAuth+OIDC, API key) criterio a criterio | Muestra los costos reales de cada opción, no una lista plana |
| 3 | Tema 19 (Árbol) | **Árbol de decisión** interactivo que termina en una recomendación con fuentes | Convierte criterios en una decisión trazable |
| 4 | Temas 3 y 19 | **Matriz «autenticación ≠ autorización»**: cambia el actor (Ana dueña / Carla ajena / Bruno agent) sobre la misma solicitud | Todos autenticados, permisos distintos; refleja las decisiones **reales** del backend (404 a lo ajeno) |
| 5 | Tema 17 (Riesgos) | **Quiz** de 6 preguntas con explicación al responder | Verifica las ideas que más se confunden |

## Aclaraciones obligatorias, cubiertas explícitamente

- **JWT es un formato, no una solución completa** (tema 9).
- **Decodificar no verifica** (temas 9 y 19, e interacción 1).
- **Firmado no significa cifrado** (tema 9, interacción 1 y quiz).
- **OAuth trata sobre autorización delegada** (tema 11; OIDC añade identidad, tema 12).
- **Las API keys suelen identificar aplicaciones, no reemplazan la identidad del usuario** (tema 10).
- **Autenticación ≠ autorización** (temas 2–3; interacción 4).
- **Ocultar botones no protege el backend** (temas 3 y 17; nota de la interacción 4).
- **No siempre conviene construir autenticación propia** (tema 16).

## Tratamiento de la información

Cada afirmación importante está etiquetada por su **naturaleza**, para que el lector sepa qué está
leyendo:

- **Dato** — hecho verificable (p. ej. «el payload de un JWT está codificado, no cifrado»).
- **Interpretación** — lectura razonada (p. ej. «sin estado ≠ sin sesión»).
- **Recomendación** — buena práctica sugerida (p. ej. «prefiere TOTP/passkeys sobre SMS»).
- **Decisión** — lo que elegimos en este taller (p. ej. «editar solo lo propio y abierto»).

## Fuentes

El tema 20 agrupa **19 fuentes** en tres bloques: especificaciones primarias (RFC 7519, RFC 8725,
RFC 6749, RFC 7636, RFC 6750, OIDC Core, WebAuthn), guías autoritativas (NIST SP 800-63-3 / 63B,
varias hojas de OWASP) y recursos internos del taller. Cada tema lista además sus fuentes al pie.

## Ética y seguridad del propio contenido

- **Todos los ejemplos son ficticios**: ningún token, contraseña ni clave real. El JWT del inspector
  es un juguete generado en el cliente.
- No se incluyen credenciales, URLs privadas ni secretos.
- El contenido construye el DOM con `textContent`; el «markdown» mínimo (`**negrita**`, `` `código` ``)
  se renderiza con nodos, nunca con `innerHTML`.

## Evidencia

- 20 temas, 22 recuadros, 3 tablas, 3 grupos de fuentes (19 enlaces) renderizados.
- Las 5 interacciones probadas en el navegador (incluido el quiz a 6/6).
- **Cero errores de consola.**
- `npm run build` genera `dist/learn/` sin errores.
