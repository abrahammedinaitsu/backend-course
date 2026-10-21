// ============================================================================
// Entrega 05B — Contenido de «El mundo de la autenticación».
//
// Los 20 contenidos obligatorios, cada uno con:
//   id, title, icon, tag  -> para la navegación
//   summary               -> una frase
//   body[]                -> bloques { type: 'p' | 'list' | 'callout' | 'table', ... }
//   sources[]             -> fuentes primarias/autoritativas por afirmación
//
// Regla de la entrega: cada afirmación importante debe poder rastrearse a su
// fuente. Se distingue dato · interpretación · recomendación · decisión con las
// etiquetas `kind` en los callouts.
//
// Todos los ejemplos son FICTICIOS: nada de tokens, passwords ni datos reales.
// ============================================================================

export const TOPICS = [
  {
    id: 'identidad',
    n: 1,
    title: 'Identidad digital',
    icon: '🪪',
    tag: 'Fundamentos',
    summary: 'Quién dices ser: el registro (la fila) que representa a un sujeto en tu sistema.',
    body: [
      { type: 'p', text: 'La identidad es el conjunto de datos que representan a un sujeto dentro de un sistema: un id estable, un email, un rol. En nuestra API es la fila en la tabla `users`.' },
      { type: 'callout', kind: 'data', text: 'Identidad ≠ autenticación. La identidad responde «¿quién dices ser?»; la autenticación responde «¿puedes demostrarlo?».' },
      { type: 'p', text: 'La identidad digital puede ser **federada** (la gestiona un tercero, como tu cuenta de Google) o **local** (la gestiona tu aplicación). Cada una tiene costos distintos.' },
      { type: 'list', items: [
        'Identificador: el nombre estable del sujeto (nunca reutilizado).',
        'Atributos: email, rol, nombre… lo que describe al sujeto.',
        'Ciclo de vida: alta (registro), cambios, baja (desactivar, no borrar).'
      ] }
    ],
    sources: ['NIST SP 800-63-3, Digital Identity Guidelines, sección de definiciones']
  },
  {
    id: 'autenticacion',
    n: 2,
    title: 'Autenticación',
    icon: '🔑',
    tag: 'Fundamentos',
    summary: 'Demostrar que eres quien dices ser: algo que sabes, tienes o eres.',
    body: [
      { type: 'p', text: 'La autenticación es el proceso de **verificar** una identidad. Si la identidad es una afirmación, la autenticación es la prueba.' },
      { type: 'p', text: 'Se apoya en factores: **algo que sabes** (una contraseña), **algo que tienes** (un teléfono, una llave física) o **algo que eres** (huella, rostro).' },
      { type: 'callout', kind: 'interpretation', text: 'Usar dos factores de la MISMA categoría (dos contraseñas) no es MFA. La fuerza viene de combinar categorías distintas.' },
      { type: 'p', text: 'En nuestra API, la autenticación ocurre en `POST /auth/login` (se demuestra la contraseña) y en la verificación del token en cada petición.' }
    ],
    sources: ['NIST SP 800-63B, Authentication and Lifecycle Management']
  },
  {
    id: 'autorizacion',
    n: 3,
    title: 'Autorización',
    icon: '🚦',
    tag: 'Fundamentos',
    summary: '¿Puede ESTE actor hacer ESTA operación? Es una pregunta distinta a la anterior.',
    body: [
      { type: 'p', text: 'La autorización decide qué puede hacer un actor ya identificado y autenticado. En nuestra API vive en `request.policy.js` (rol + propiedad + estado).' },
      { type: 'callout', kind: 'decision', text: 'Nuestra decisión: un requester edita contenido solo de lo PROPIO y ABIERTO; un agent cambia prioridad y estado, pero NO crea solicitudes.' },
      { type: 'p', text: 'Un sistema puede tener login perfecto y seguir siendo inseguro: si tras autenticar no hay política, **todo autenticado puede todo**.' },
      { type: 'callout', kind: 'recommendation', text: 'Deja la autorización en funciones puras y testeables, separadas de la autenticación. Son dos preguntas distintas.' }
    ],
    sources: ['OWASP Authorization Cheat Sheet', 'NIST SP 800-162, Guide to ABAC']
  },
  {
    id: 'auditoria',
    n: 4,
    title: 'Auditoría',
    icon: '📜',
    tag: 'Fundamentos',
    summary: '¿Quién hizo qué? Sin auditoría sabrás que nadie hizo lo prohibido, pero no quién hizo lo permitido.',
    body: [
      { type: 'p', text: 'La auditoría registra los actos: quién, qué, cuándo. En nuestra API es la columna `changed_by` de `request_status_history`.' },
      { type: 'callout', kind: 'data', text: 'En nuestra solución, cada transición de estado registra al actor tomado del token verificado — nunca del cuerpo de la petición.' },
      { type: 'p', text: 'La auditoría permite responder preguntas reales: «¿el agent atendió su propia solicitud?», «¿quién cerró esto y cuándo?».' }
    ],
    sources: ['OWASP Logging Cheat Sheet']
  },
  {
    id: 'passwords',
    n: 5,
    title: 'Passwords',
    icon: '🔒',
    tag: 'Credenciales',
    summary: 'Nunca se guardan en texto plano: se guarda un hash lento y con salt.',
    body: [
      { type: 'p', text: 'Una contraseña **no** se guarda ni se registra. Se calcula un **hash** con una función lenta y un **salt** único por usuario, y se guarda solo eso.' },
      { type: 'list', items: [
        'Nunca guardes la contraseña en texto plano ni «cifrada» de forma reversible.',
        'Usa funciones diseñadas para esto: scrypt, Argon2, bcrypt.',
        'NUNCA uses un hash rápido (MD5/SHA-1/SHA-256 a secas): se rompen por fuerza bruta a gran velocidad.'
      ] },
      { type: 'callout', kind: 'data', text: 'La longitud mínima de 15 caracteres y permitir espacios/Unicode (sin reglas arbitrarias de composición) sigue la recomendación de NIST SP 800-63B.' },
      { type: 'p', text: 'En nuestra API, `password.js` usa **scrypt** (el helper del curso) y las contraseñas se validan por puntos de código (acepta emojis válidos).' }
    ],
    sources: ['NIST SP 800-63B §5.1.1', 'OWASP Password Storage Cheat Sheet']
  },
  {
    id: 'sesiones',
    n: 6,
    title: 'Sesiones',
    icon: '🧩',
    tag: 'Estado',
    summary: 'El servidor recuerda que ya te autenticaste; el estado puede vivir en el servidor o en el cliente.',
    body: [
      { type: 'p', text: 'Una sesión mantiene el estado de autenticación entre peticiones. Hay dos grandes familias:' },
      { type: 'list', items: [
        '**Sesión con estado en servidor**: el servidor guarda la sesión y entrega un id de sesión (a menudo en una cookie). Fácil de **revocar**.',
        '**Token autocontenido** (JWT): el estado va en el token; el servidor **no** guarda nada. Difícil de revocar antes de expirar.'
      ] },
      { type: 'callout', kind: 'interpretation', text: '«Sin estado» no significa «sin sesión»: significa que el servidor no la almacena. La revocación, entonces, exige otra pieza (lista de revocación, refresh tokens cortos).' }
    ],
    sources: ['OWASP Session Management Cheat Sheet']
  },
  {
    id: 'cookies',
    n: 7,
    title: 'Cookies',
    icon: '🍪',
    tag: 'Estado',
    summary: 'El navegador las envía automáticamente: cómodas y, por eso mismo, peligrosas.',
    body: [
      { type: 'p', text: 'Las cookies son datos que el navegador guarda y **adjunta automáticamente** a cada petición al mismo dominio. Por eso se usan para sesiones con estado en servidor.' },
      { type: 'list', items: [
        '`HttpOnly`: JavaScript no puede leerla (mitiga el robo por XSS).',
        '`Secure`: solo viaja por HTTPS.',
        '`SameSite`: limita el envío en peticiones cruzadas (mitiga CSRF).'
      ] },
      { type: 'callout', kind: 'data', text: 'El envío automático es la raíz del CSRF: el navegador manda la cookie aunque la petición la origine otro sitio. Por eso importa `SameSite` y los tokens anti-CSRF.' }
    ],
    sources: ['OWASP CSRF Prevention Cheat Sheet', 'MDN: Set-Cookie']
  },
  {
    id: 'bearer',
    n: 8,
    title: 'Bearer tokens',
    icon: '🎟️',
    tag: 'Estado',
    summary: '«Quien lo porta, lo tiene»: el token es la credencial, así que vale tanto como una contraseña.',
    body: [
      { type: 'p', text: 'Un bearer token se presenta en el header `Authorization: Bearer <token>`. **Quien lo tiene, lo usa**: no hay prueba adicional de identidad.' },
      { type: 'callout', kind: 'recommendation', text: 'Trata un bearer token como tratarías una contraseña: nunca en la URL, nunca en logs, expiración corta, transmisión solo por HTTPS.' },
      { type: 'p', text: 'Nuestra API exige exactamente el esquema `Bearer`: un `Basic ...`, un token pelado o un `Bearer` vacío **no** son identidades (dan `401`).' }
    ],
    sources: ['RFC 6750, The OAuth 2.0 Authorization Framework: Bearer Token Usage']
  },
  {
    id: 'jwt',
    n: 9,
    title: 'JWT (JSON Web Token)',
    icon: '🪙',
    tag: 'Tokens',
    summary: 'Un formato de token: tres partes separadas por puntos. Formato, no solución.',
    body: [
      { type: 'p', text: 'Un JWT tiene tres segmentos `base64url` separados por puntos: **header** (algoritmo), **payload** (claims) y **firma**.' },
      { type: 'list', items: [
        '`sub`: el sujeto (id del usuario).',
        '`role`: nuestro claim propio para el rol.',
        '`iat`, `exp`: emitido en y expira en.',
        '`iss`, `aud`: quién lo emitió y para quién es.'
      ] },
      { type: 'callout', kind: 'data', text: '**JWT es un formato, no una solución completa.** No dice nada sobre cómo autenticas, cómo revocas ni dónde lo guardas.' },
      { type: 'callout', kind: 'data', text: '**Decodificar no verifica.** El payload está codificado, no cifrado: cualquiera lo lee. Solo la verificación de la firma con la clave del servidor permite **confiar**.' },
      { type: 'callout', kind: 'data', text: '**Firmado no significa cifrado.** La firma garantiza integridad y autoría; NO oculta el contenido.' },
      { type: 'p', text: 'Nuestra API verifica con `jose` (`jwtVerify`): firma, algoritmo, emisor, audiencia y expiración. Si algo falla → `401 INVALID_TOKEN` (una misma respuesta, sin revelar qué control falló).' }
    ],
    sources: ['RFC 7519, JSON Web Token (JWT)', 'RFC 8725, JWT Best Current Practices']
  },
  {
    id: 'apikeys',
    n: 10,
    title: 'API keys',
    icon: '🗝️',
    tag: 'Tokens',
    summary: 'Suelen identificar APLICACIONES, no personas. No reemplazan la identidad del usuario.',
    body: [
      { type: 'p', text: 'Una API key es una credencial de larga vida que identifica, típicamente, a una **aplicación** o a un proyecto — no a un usuario concreto.' },
      { type: 'callout', kind: 'interpretation', text: 'Las API keys **no** reemplazan la identidad del usuario. Sirven para cuotas, facturación y autorización de la app; no dicen «quién es esta persona».' },
      { type: 'list', items: [
        'No las pongas en el frontend: cualquiera las lee en el navegador.',
        'Rótalas y permitir revocarlas por separado.',
        'No las uses como único control de acceso a datos de usuarios.'
      ] }
    ],
    sources: ['OWASP API Security Top 10 (API2: Broken Authentication)']
  },
  {
    id: 'oauth2',
    n: 11,
    title: 'OAuth 2',
    icon: '🤝',
    tag: 'Delegación',
    summary: 'Autorización DELEGADA: dar acceso limitado a un tercero sin compartir tu contraseña.',
    body: [
      { type: 'p', text: 'OAuth 2 es un marco de **autorización delegada**. Permite que una aplicación acceda a recursos tuyos en otro servicio **sin** conocer tu contraseña.' },
      { type: 'callout', kind: 'data', text: 'OAuth 2 trata sobre **autorización**, no sobre identidad. No es, por sí solo, una forma de «iniciar sesión».' },
      { type: 'list', items: [
        'Roles: resource owner, client, authorization server, resource server.',
        'El flujo moderno recomendado para apps con servidor es **Authorization Code + PKCE**.',
        'El flujo «implicit» está obsoleto y no debe usarse.'
      ] }
    ],
    sources: ['RFC 6749, The OAuth 2.0 Authorization Framework', 'RFC 7636, PKCE', 'OAuth 2.0 Security Best Current Practice']
  },
  {
    id: 'oidc',
    n: 12,
    title: 'OpenID Connect',
    icon: '🧬',
    tag: 'Delegación',
    summary: 'Añade IDENTIDAD encima de OAuth 2: el «iniciar sesión con…».',
    body: [
      { type: 'p', text: 'OpenID Connect (OIDC) es una **capa de identidad** sobre OAuth 2. Añade el concepto de **ID Token** (un JWT con datos de quién es el usuario) y el endpoint `userinfo`.' },
      { type: 'callout', kind: 'data', text: 'OAuth 2 = autorización delegada. OpenID Connect = identidad encima de esa delegación. Confundirlos es el error más común.' },
      { type: 'p', text: 'Es lo que hay detrás de «Iniciar sesión con Google/Apple/Microsoft».' }
    ],
    sources: ['OpenID Connect Core 1.0', 'RFC 6749']
  },
  {
    id: 'mfa',
    n: 13,
    title: 'MFA (autenticación multifactor)',
    icon: '🧮',
    tag: 'Refuerzo',
    summary: 'Combinar factores de categorías distintas: saber + tener + ser.',
    body: [
      { type: 'p', text: 'MFA combina dos o más factores de **categorías distintas**: algo que sabes, algo que tienes, algo que eres.' },
      { type: 'list', items: [
        'TOTP (app autenticadora) y llaves de seguridad (WebAuthn) son formas sólidas de «algo que tienes».',
        'El SMS es débil (SIM swapping, interceptación) pero mejor que nada.',
        'El email de respaldo es un segundo canal, no necesariamente un segundo factor fuerte.'
      ] },
      { type: 'callout', kind: 'recommendation', text: 'Prefiere TOTP o passkeys sobre SMS cuando puedas elegir.' }
    ],
    sources: ['NIST SP 800-63B', 'OWASP Multifactor Authentication Cheat Sheet']
  },
  {
    id: 'passkeys',
    n: 14,
    title: 'Passkeys',
    icon: '🧿',
    tag: 'Refuerzo',
    summary: 'Llaves criptográficas ligadas al dispositivo: sin contraseña que robar por phishing.',
    body: [
      { type: 'p', text: 'Una passkey es un par de llaves (WebAuthn/FIDO2): la llave privada nunca sale del dispositivo; el servidor guarda la pública.' },
      { type: 'list', items: [
        'Resistentes al phishing: la credencial está ligada al dominio de origen.',
        'No viajan secretos reutilizables que interceptar.',
        'Respaldadas/sincronizadas por el ecosistema (iCloud, Google), lo que tiene matices de seguridad.'
      ] },
      { type: 'callout', kind: 'interpretation', text: 'Las passkeys son «algo que tienes» (a veces desbloqueado por «algo que eres»); no eliminan del todo la necesidad de recuperación de cuenta.' }
    ],
    sources: ['W3C Web Authentication (WebAuthn)', 'FIDO2 Specifications']
  },
  {
    id: 'idp',
    n: 15,
    title: 'Proveedores de identidad',
    icon: '🏛️',
    tag: 'Ecosistema',
    summary: 'Terceros que gestionan la identidad: Auth0, Okta, Keycloak, Cognito, Entra ID…',
    body: [
      { type: 'p', text: 'Un proveedor de identidad (IdP) centraliza autenticación, MFA, recuperación y federación. Tu app delega en él y confía en los tokens/afirmaciones que emite.' },
      { type: 'list', items: [
        'Gestionados (SaaS): Auth0, Okta, Entra ID, Cognito, Firebase Auth.',
        'Autoalojados: Keycloak, Ory, Authentik.',
        'Protocolos: OIDC/SAML para federación.'
      ] },
      { type: 'callout', kind: 'recommendation', text: 'Si tu equipo no es de seguridad, delegar reduce la superficie de error: es difícil construir auth propio correctamente.' }
    ],
    sources: ['OpenID Connect Core', 'Documentación de Keycloak/Okta/Auth0']
  },
  {
    id: 'propia-vs-gestionada',
    n: 16,
    title: 'Autenticación propia frente a gestionada',
    icon: '⚖️',
    tag: 'Ecosistema',
    summary: 'Construir da control; delegar da seguridad y velocidad. No siempre conviene construir.',
    body: [
      { type: 'p', text: 'Es la decisión de arquitectura central. Cada opción tiene costos reales.' },
      { type: 'table', headers: ['Criterio', 'Propia', 'Gestionada'], rows: [
        ['Control total', 'Alto', 'Limitado por el proveedor'],
        ['Velocidad inicial', 'Lenta', 'Rápida'],
        ['Superficie de error', 'Grande (MFA, recuperación, rotación)', 'Menor (la gestiona el proveedor)'],
        ['Costo', 'Tiempo de ingeniería', 'Suscripción'],
        ['Dependencia', 'Nula', 'Del proveedor (vendor lock-in)']
      ] },
      { type: 'callout', kind: 'decision', text: 'En este taller construimos auth propio **a propósito**, para entender el mecanismo. En un producto real con equipo pequeño, lo más probable es delegar.' },
      { type: 'callout', kind: 'data', text: '«No siempre conviene construir autenticación propia»: es una aclaración explícita de la especificación de esta entrega.' }
    ],
    sources: ['OWASP Authentication Cheat Sheet', 'NIST SP 800-63']
  },
  {
    id: 'riesgos',
    n: 17,
    title: 'Riesgos comunes',
    icon: '⚠️',
    tag: 'Amenazas',
    summary: 'XSS, CSRF, IDOR, credential stuffing, phishing, tokens mal verificados…',
    body: [
      { type: 'p', text: 'Los ataques más frecuentes contra la identidad no son exóticos: son descuidos conocidos.' },
      { type: 'table', headers: ['Riesgo', 'Qué es', 'Defensa principal'], rows: [
        ['XSS', 'Inyectar script que lee el token/estado', 'Escapar salida, CSP, token HttpOnly o en memoria'],
        ['CSRF', 'Petición cruzada con la cookie del usuario', 'SameSite, tokens anti-CSRF'],
        ['IDOR', 'Cambiar el id y acceder a lo ajeno', 'Autorización por recurso + 404 en lo ajeno'],
        ['Credential stuffing', 'Reusar contraseñas filtradas', 'MFA, rate limiting, detección'],
        ['Phishing', 'Engañar para robar credenciales', 'Passkeys/FIDO2, educación'],
        ['JWT mal verificado', 'Confiar en un payload decodificado', 'Verificar firma/alg/iss/aud/exp']
      ] },
      { type: 'callout', kind: 'recommendation', text: 'Oculta botones y aun así el backend debe decidir: **ocultar botones no protege el backend**.' }
    ],
    sources: ['OWASP Top 10', 'OWASP API Security Top 10', 'RFC 8725']
  },
  {
    id: 'casos',
    n: 18,
    title: 'Casos de uso',
    icon: '🧭',
    tag: 'Aplicación',
    summary: 'Qué mecanismo encaja en qué escenario real.',
    body: [
      { type: 'p', text: 'No hay una sola respuesta correcta: depende del escenario.' },
      { type: 'table', headers: ['Escenario', 'Mecanismo razonable'], rows: [
        ['App web con servidor propio', 'Sesión con cookie HttpOnly + MFA'],
        ['SPA + API propia', 'OAuth2/OIDC con Authorization Code + PKCE, o sesión con cookie'],
        ['App móvil', 'OIDC con PKCE + almacenamiento seguro del dispositivo'],
        ['Servicio a servicio', 'Client credentials (OAuth2) o mTLS'],
        ['Script/CLI personal', 'API key o token de corta vida'],
        ['«Iniciar sesión con Google»', 'OpenID Connect']
      ] }
    ],
    sources: ['OAuth 2.0 Security BCP', 'OpenID Connect Core']
  },
  {
    id: 'arbol',
    n: 19,
    title: 'Árbol de decisión',
    icon: '🌳',
    tag: 'Aplicación',
    summary: 'Un recorrido interactivo para elegir estrategia según tu caso.',
    body: [
      { type: 'p', text: 'Usa el **árbol interactivo** de abajo para recorrer las preguntas y llegar a una recomendación. Empieza por «¿construyo mi propia autenticación?».' },
      { type: 'callout', kind: 'interpretation', text: 'El árbol no reemplaza el juicio: da una recomendación por defecto, no una ley. Documenta siempre tu decisión y sus costos.' }
    ],
    sources: ['Síntesis de OWASP/NIST; ver cada nodo para su fuente']
  },
  {
    id: 'fuentes',
    n: 20,
    title: 'Fuentes',
    icon: '📚',
    tag: 'Aplicación',
    summary: 'Todas las fuentes primarias y autoritativas usadas.',
    body: [
      { type: 'p', text: 'Fuentes primarias (especificaciones) y autoritativas (guías de seguridad) usadas para cada afirmación. Se diferencia dato · interpretación · recomendación · decisión.' }
    ],
    sources: []
  }
];

// ---------------------------------------------------------------------------
// Fuentes, agrupadas por tipo. Cada afirmación de arriba se ancla aquí.
// ---------------------------------------------------------------------------
export const SOURCE_GROUPS = [
  {
    kind: 'Especificaciones (primarias)',
    items: [
      { label: 'RFC 7519 — JSON Web Token (JWT)', url: 'https://www.rfc-editor.org/rfc/rfc7519' },
      { label: 'RFC 8725 — JWT Best Current Practices', url: 'https://www.rfc-editor.org/rfc/rfc8725' },
      { label: 'RFC 6749 — The OAuth 2.0 Authorization Framework', url: 'https://www.rfc-editor.org/rfc/rfc6749' },
      { label: 'RFC 7636 — PKCE', url: 'https://www.rfc-editor.org/rfc/rfc7636' },
      { label: 'RFC 6750 — Bearer Token Usage', url: 'https://www.rfc-editor.org/rfc/rfc6750' },
      { label: 'OpenID Connect Core 1.0', url: 'https://openid.net/specs/openid-connect-core-1_0.html' },
      { label: 'W3C Web Authentication (WebAuthn)', url: 'https://www.w3.org/TR/webauthn-2/' }
    ]
  },
  {
    kind: 'Guías autoritativas',
    items: [
      { label: 'NIST SP 800-63-3 — Digital Identity Guidelines', url: 'https://pages.nist.gov/800-63-3/' },
      { label: 'NIST SP 800-63B — Authentication & Lifecycle', url: 'https://pages.nist.gov/800-63-3/sp800-63b.html' },
      { label: 'OWASP Password Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html' },
      { label: 'OWASP Authentication Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html' },
      { label: 'OWASP Session Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html' },
      { label: 'OWASP CSRF Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html' },
      { label: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' },
      { label: 'OWASP API Security Top 10', url: 'https://owasp.org/API-Security/' }
    ]
  },
  {
    kind: 'Recursos internos del taller',
    items: [
      { label: 'Clase 05 · lectura IAAA (identidad, autenticación, autorización, auditoría)', url: 'sesiones/02-mapa-contrato' },
      { label: 'Clase 05 · matriz de acceso explicada celda por celda', url: 'sesiones/02-mapa-contrato' },
      { label: 'Clase 05 · anatomía de un JWT', url: 'sesiones/07-estacion-4-login-jwt' },
      { label: 'Clase 05 · hashing de passwords, sin magia', url: 'sesiones/06-estacion-3-passwords' }
    ]
  }
];
