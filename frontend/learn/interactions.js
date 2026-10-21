// ============================================================================
// Entrega 05B — Interacciones significativas.
//
// Requisito: al menos TRES interacciones que TRANSFORMEN el entendimiento (no
// hover, no acordeón decorativo). Aquí hay CINCO:
//   1. Inspector de un JWT FICTICIO (decodificar vs. verificar, expiración).
//   2. Comparador de estrategias de autenticación.
//   3. Árbol de decisión (recorrido interactivo).
//   4. Demostración de autenticación ≠ autorización (matriz interactiva).
//   5. Quiz de verificación conceptual.
//
// Todos los datos son INVENTADOS. Nada de tokens, passwords ni claves reales.
// ============================================================================

import { el } from './dom.js';

// ---------------------------------------------------------------------------
// 1) Inspector de JWT ficticio
// ---------------------------------------------------------------------------
// Un token de juguete construido con base64url de contenido ficticio. NO está
// firmado con ninguna clave real: es un ejemplo didáctico.
const FAKE_HEADER = { alg: 'HS256', typ: 'JWT' };
const FAKE_PAYLOAD = {
  sub: 'usuario-0000-1111',
  role: 'requester',
  iat: 1700000000,
  exp: 1700003600,
  iss: 'backend-course-api',
  aud: 'backend-course-client'
};

function b64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function jwtInspector() {
  const header = b64url(FAKE_HEADER);
  const payload = b64url(FAKE_PAYLOAD);
  // Firma FICTICIA (texto cualquiera): la idea es que "existe un segmento de firma".
  const signature = 'firma-ficticia-no-verificable';

  const wrap = el('div', { className: 'interactive' });
  wrap.append(el('h4', { text: '🔎 Inspector de JWT (ejemplo ficticio)' }));
  wrap.append(el('p', { className: 'muted', text: 'Este token es de juguete. Ningún dato es real y la firma no sirve para verificar nada.' }));

  const tokenBox = el('code', { className: 'token-box' });
  const parts = [header, payload, signature];
  tokenBox.append(
    el('span', { className: 'seg seg-header', text: header }),
    document.createTextNode('.'),
    el('span', { className: 'seg seg-payload', text: payload }),
    document.createTextNode('.'),
    el('span', { className: 'seg seg-signature', text: signature })
  );
  wrap.append(tokenBox);

  const controls = el('div', { className: 'row' });
  const decoded = el('div', { className: 'result' });
  const verdict = el('div', { className: 'verdict' });

  const decodeBtn = el('button', { type: 'button', text: 'Decodificar (leer)' });
  const verifyBtn = el('button', { type: 'button', className: 'secondary', text: 'Verificar (confiar)' });
  controls.append(decodeBtn, verifyBtn);
  wrap.append(controls, decoded, verdict);

  decodeBtn.addEventListener('click', () => {
    decoded.replaceChildren(
      el('div', { className: 'seg-label seg-header', text: 'Header' }),
      el('pre', { text: JSON.stringify(FAKE_HEADER, null, 2) }),
      el('div', { className: 'seg-label seg-payload', text: 'Payload (LEGIBLE por cualquiera)' }),
      el('pre', { text: JSON.stringify(FAKE_PAYLOAD, null, 2) })
    );
    verdict.className = 'verdict is-warn';
    verdict.textContent =
      'Leer no es confiar. El payload está solo codificado: cualquiera lo ve. Decodificado ≠ verificado.';
  });

  verifyBtn.addEventListener('click', () => {
    decoded.replaceChildren(
      el('p', { text: 'Comprobaciones de un verificador real (firma, alg, iss, aud, exp)…' }),
      el('ul', { className: 'checks', children: [
        el('li', { text: '✗ Firma: no coincide con ninguna clave conocida (token de juguete).' }),
        el('li', { text: '✗ Esta firma no es verificable → el token NO es confiable.' })
      ] })
    );
    verdict.className = 'verdict is-error';
    verdict.textContent =
      'Verificar falla → en una API real esto responde 401 INVALID_TOKEN. Una misma respuesta, sin decir qué control falló.';
  });

  return wrap;
}

// ---------------------------------------------------------------------------
// 2) Comparador de estrategias
// ---------------------------------------------------------------------------
const STRATEGIES = {
  session: {
    name: 'Sesión (cookie HttpOnly)',
    rows: {
      'Dónde vive el estado': 'En el servidor (id de sesión)',
      'Revocación': 'Inmediata (borras la sesión)',
      'Riesgo principal': 'CSRF (cookie automática)',
      'Ideal para': 'Apps web con backend propio',
      'Escala': 'Requiere almacén de sesiones'
    }
  },
  jwt: {
    name: 'JWT en memoria (SPA)',
    rows: {
      'Dónde vive el estado': 'En el token (cliente)',
      'Revocación': 'Difícil antes de expirar',
      'Riesgo principal': 'XSS (si lo persistes mal)',
      'Ideal para': 'SPA + API, servicios',
      'Escala': 'Sin estado en el servidor'
    }
  },
  oauth: {
    name: 'OAuth2 + OIDC (delegado)',
    rows: {
      'Dónde vive el estado': 'En el proveedor de identidad',
      'Revocación': 'Delegada al proveedor',
      'Riesgo principal': 'Configuración del flujo (PKCE, redirects)',
      'Ideal para': '«Iniciar sesión con…», móviles',
      'Escala': 'La escala el proveedor'
    }
  },
  apikey: {
    name: 'API key',
    rows: {
      'Dónde vive el estado': 'No hay sesión de usuario',
      'Revocación': 'Rotando la clave',
      'Riesgo principal': 'Fuga en el cliente (queda expuesta)',
      'Ideal para': 'Servicio a servicio, cuotas',
      'Escala': 'Alta'
    }
  }
};

export function strategyComparator() {
  const wrap = el('div', { className: 'interactive' });
  wrap.append(el('h4', { text: '⚖️ Comparador de estrategias' }));
  wrap.append(el('p', { className: 'muted', text: 'Elige dos estrategias y compáralas criterio por criterio.' }));

  const controls = el('div', { className: 'row' });
  const selA = el('select');
  const selB = el('select');
  for (const [key, s] of Object.entries(STRATEGIES)) {
    selA.append(el('option', { text: s.name, attrs: { value: key } }));
    selB.append(el('option', { text: s.name, attrs: { value: key } }));
  }
  selA.value = 'session';
  selB.value = 'jwt';
  controls.append(el('label', { className: 'inline', children: [document.createTextNode('A'), selA] }),
                  el('label', { className: 'inline', children: [document.createTextNode('B'), selB] }));
  wrap.append(controls);

  const table = el('div', { className: 'compare' });
  wrap.append(table);

  function render() {
    const a = STRATEGIES[selA.value];
    const b = STRATEGIES[selB.value];
    const rows = Object.keys(a.rows).map((criterion) => {
      const same = a.rows[criterion] === b.rows[criterion];
      return el('div', { className: 'compare-row' + (same ? ' is-same' : '') , children: [
        el('div', { className: 'compare-criterion', text: criterion }),
        el('div', { className: 'compare-cell', text: a.rows[criterion] }),
        el('div', { className: 'compare-cell', text: b.rows[criterion] })
      ] });
    });
    table.replaceChildren(
      el('div', { className: 'compare-row compare-head', children: [
        el('div', { className: 'compare-criterion', text: 'Criterio' }),
        el('div', { className: 'compare-cell', text: a.name }),
        el('div', { className: 'compare-cell', text: b.name })
      ] }),
      ...rows,
      el('p', { className: 'muted', text: 'Las filas atenuadas son criterios donde ambas coinciden.' })
    );
  }
  selA.addEventListener('change', render);
  selB.addEventListener('change', render);
  render();
  return wrap;
}

// ---------------------------------------------------------------------------
// 3) Árbol de decisión
// ---------------------------------------------------------------------------
const TREE = {
  start: {
    q: '¿Tu equipo tiene especialistas en seguridad que mantendrán la autenticación?',
    yes: 'propia',
    no: 'managed',
    hint: 'Construir auth propio es fácil de empezar y difícil de mantener (MFA, recuperación, rotación).'
  },
  managed: {
    q: '¿Necesitas «iniciar sesión con Google/Apple/Microsoft» o federación corporativa?',
    yes: 'oidc',
    no: 'provider',
    hint: 'La federación es exactamente lo que resuelve OIDC.'
  },
  propia: {
    q: '¿Tu cliente principal es una app web con backend propio (puede usar cookies)?',
    yes: 'session',
    no: 'jwt',
    hint: 'Con backend propio, la cookie HttpOnly te da revocación inmediata.'
  },
  oidc: {
    result: 'OpenID Connect sobre OAuth 2 (Authorization Code + PKCE). Delegas identidad a un proveedor y no gestionas contraseñas.',
    sources: ['OpenID Connect Core 1.0', 'RFC 7636 (PKCE)']
  },
  provider: {
    result: 'Un proveedor de identidad gestionado (Auth0, Okta, Keycloak, Cognito). Delegas la superficie de error de la autenticación.',
    sources: ['OWASP Authentication Cheat Sheet', 'NIST SP 800-63']
  },
  session: {
    result: 'Sesión con estado en el servidor + cookie HttpOnly, Secure y SameSite. Fácil de revocar; cuida el CSRF.',
    sources: ['OWASP Session Management Cheat Sheet']
  },
  jwt: {
    result: 'JWT verificado (firma, alg, iss, aud, exp) guardado en memoria, con expiración corta. Acepta que la revocación es difícil.',
    sources: ['RFC 7519', 'RFC 8725']
  }
};

export function decisionTree() {
  const wrap = el('div', { className: 'interactive' });
  wrap.append(el('h4', { text: '🌳 Árbol de decisión' }));
  wrap.append(el('p', { className: 'muted', text: 'Responde las preguntas para llegar a una recomendación por defecto.' }));

  const trail = el('ol', { className: 'trail' });
  const step = el('div', { className: 'tree-step' });
  const restart = el('button', { type: 'button', className: 'ghost', text: 'Empezar de nuevo' });
  restart.hidden = true;
  restart.addEventListener('click', () => render('start'));
  wrap.append(step, restart, trail);

  const path = [];
  function render(nodeKey) {
    const node = TREE[nodeKey];
    step.replaceChildren();
    if (node.result) {
      step.append(
        el('div', { className: 'verdict is-ok', text: node.result }),
        el('p', { className: 'muted', text: 'Fuentes: ' + node.sources.join(' · ') })
      );
      restart.hidden = false;
      return;
    }
    step.append(el('p', { className: 'tree-question', text: node.q }));
    step.append(el('p', { className: 'muted', text: node.hint }));
    const btns = el('div', { className: 'row' });
    const yes = el('button', { type: 'button', text: 'Sí' });
    const no = el('button', { type: 'button', className: 'secondary', text: 'No' });
    yes.addEventListener('click', () => { path.push(`${node.q} → Sí`); render(node.yes); });
    no.addEventListener('click', () => { path.push(`${node.q} → No`); render(node.no); });
    btns.append(yes, no);
    step.append(btns);
    restart.hidden = path.length === 0;
    trail.replaceChildren(...path.map(p => el('li', { text: p })));
  }
  render('start');
  return wrap;
}

// ---------------------------------------------------------------------------
// 4) Autenticación ≠ autorización (matriz interactiva)
// ---------------------------------------------------------------------------
const ACTORS = {
  requester: { label: 'Requester (Ana)', userId: 'u-ana' },
  agent: { label: 'Agent (Bruno)', userId: 'u-bruno' },
  other: { label: 'Requester (Carla)', userId: 'u-carla' }
};
const SAMPLE_REQUEST = { id: 17, title: 'Proyector del aula 204', status: 'open', createdBy: 'u-ana' };
const OPERATIONS = [
  { key: 'view', label: 'Ver la solicitud', decide: (a, r) => a.userId === r.createdBy || a.label.startsWith('Agent') },
  { key: 'edit', label: 'Editar el título', decide: (a, r) => a.userId === r.createdBy && r.status === 'open' && a.label.startsWith('Requester') },
  { key: 'priority', label: 'Cambiar la prioridad', decide: (a) => a.label.startsWith('Agent') },
  { key: 'status', label: 'Cambiar el estado', decide: (a) => a.label.startsWith('Agent') }
];

export function authnVsAuthz() {
  const wrap = el('div', { className: 'interactive' });
  wrap.append(el('h4', { text: '🧪 Autenticación ≠ autorización' }));
  wrap.append(el('p', { className: 'muted', text: 'Todos estos actores están AUTENTICADOS. Cambia el actor y observa que el mismo token no implica el mismo permiso.' }));

  const controls = el('div', { className: 'row' });
  const sel = el('select');
  for (const [key, a] of Object.entries(ACTORS)) sel.append(el('option', { text: a.label, attrs: { value: key } }));
  controls.append(el('label', { className: 'inline', children: [document.createTextNode('Actor autenticado'), sel] }));
  wrap.append(controls);

  const list = el('div', { className: 'authz' });
  wrap.append(list);

  function render() {
    const actor = ACTORS[sel.value];
    list.replaceChildren(...OPERATIONS.map((op) => {
      const allowed = op.decide(actor, SAMPLE_REQUEST);
      // Espejo del backend: lo ajeno responde 404 (no revela existencia), lo prohibido 403.
      const isForeign = actor.userId !== SAMPLE_REQUEST.createdBy && op.key === 'view';
      const code = allowed ? 200 : (op.key === 'view' && isForeign ? 404 : 403);
      return el('div', { className: 'authz-row' + (allowed ? ' is-allow' : ' is-deny'), children: [
        el('span', { className: 'authz-op', text: op.label }),
        el('span', { className: 'authz-code', text: allowed ? '✅ permitido' : `⛔ HTTP ${code}` })
      ] });
    }));
  }
  sel.addEventListener('change', render);
  render();
  wrap.append(el('p', { className: 'muted', text: 'La solicitud #17 es de Ana y está abierta. Recuerda: ocultar botones no protege el backend; esta tabla solo refleja lo que el servidor decide.' }));
  return wrap;
}

// ---------------------------------------------------------------------------
// 5) Quiz
// ---------------------------------------------------------------------------
const QUIZ = [
  {
    q: '¿Qué significa que un JWT esté «firmado»?',
    options: [
      'Que su contenido está cifrado y nadie puede leerlo.',
      'Que se puede comprobar integridad y autoría, pero su contenido sigue siendo legible.',
      'Que ya no puede expirar.'
    ],
    correct: 1,
    why: 'Firmado no es cifrado. El payload se lee; la firma da integridad y autoría.'
  },
  {
    q: '¿Decodificar un JWT permite confiar en él?',
    options: [
      'Sí, si el payload se ve correcto.',
      'No: decodificar solo lee; hay que verificar la firma y los claims.',
      'Solo si usas HTTPS.'
    ],
    correct: 1,
    why: 'Cualquiera puede alterar el payload; solo la verificación con la clave del servidor permite confiar.'
  },
  {
    q: 'OAuth 2 trata principalmente sobre…',
    options: ['Identidad del usuario', 'Autorización delegada', 'Cifrado de contraseñas'],
    correct: 1,
    why: 'OAuth 2 = autorización delegada. OpenID Connect añade identidad encima.'
  },
  {
    q: 'Una API key típicamente identifica…',
    options: ['A la persona usuaria', 'A la aplicación', 'Al navegador'],
    correct: 1,
    why: 'Las API keys suelen identificar aplicaciones/proyectos, no la identidad del usuario.'
  },
  {
    q: '¿Por qué ocultar un botón no es autorización?',
    options: [
      'Porque se ve mal.',
      'Porque cualquiera puede llamar al endpoint directamente; el backend debe decidir.',
      'Porque los botones son accesibles.'
    ],
    correct: 1,
    why: 'La UI no es una frontera de seguridad: el backend vuelve a decidir (403/404) aunque el botón no exista.'
  },
  {
    q: 'Ante un recurso ajeno, ¿por qué responder 404 y no 403?',
    options: [
      'Porque 403 está deprecado.',
      'Un 403 confirma que existe (enumeración gratis); el 404 no revela nada.',
      'Porque es más fácil de programar.'
    ],
    correct: 1,
    why: 'Primero visibilidad (404), después permiso (403). No regalar la existencia del recurso.'
  }
];

export function quiz() {
  const wrap = el('div', { className: 'interactive' });
  wrap.append(el('h4', { text: '📝 Quiz de verificación' }));
  wrap.append(el('p', { className: 'muted', text: 'Seis preguntas sobre las ideas que más se confunden.' }));

  const score = el('div', { className: 'verdict' });
  const state = { answered: 0, correct: 0 };
  const form = el('div', { className: 'quiz' });

  QUIZ.forEach((item, i) => {
    const block = el('div', { className: 'quiz-q' });
    block.append(el('p', { className: 'quiz-text', text: `${i + 1}. ${item.q}` }));
    const opts = el('div', { className: 'quiz-opts' });
    item.options.forEach((opt, j) => {
      const btn = el('button', { type: 'button', className: 'quiz-opt', text: opt });
      btn.addEventListener('click', () => {
        if (block.dataset.done) return;
        block.dataset.done = '1';
        state.answered++;
        const good = j === item.correct;
        if (good) state.correct++;
        btn.classList.add(good ? 'is-correct' : 'is-wrong');
        // Marcar la correcta si falló.
        if (!good) opts.children[item.correct].classList.add('is-correct');
        block.append(el('p', { className: good ? 'verdict is-ok' : 'verdict is-error', text: (good ? '✔ ' : '✘ ') + item.why }));
        score.className = 'verdict is-ok';
        score.textContent = `Acertadas: ${state.correct} / ${state.answered} respondidas (de ${QUIZ.length}).`;
      });
      opts.append(btn);
    });
    block.append(opts);
    form.append(block);
  });

  wrap.append(form, score);
  return wrap;
}

// Registro de interacciones por tema (id del contenido -> widgets).
export const INTERACTIONS = {
  jwt: () => [jwtInspector()],
  sesiones: () => [strategyComparator()],
  arbol: () => [decisionTree(), authnVsAuthz()],
  autorizacion: () => [authnVsAuthz()],
  riesgos: () => [quiz()]
};
