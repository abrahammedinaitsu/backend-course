// ============================================================================
// Entrega 05A — Interfaz real para la Request API (clase 05).
//
// Arquitectura (módulos pequeños, responsabilidad única):
//   api.js            -> único lugar que toca fetch
//   errors.js         -> (status, body) -> mensaje accionable
//   domain.js         -> estados/transiciones y espejo de autorización (para UI)
//   session.js        -> token y usuario actual (en memoria)
//   requests-api.js   -> endpoints reales de solicitudes
//   ui.js             -> construcción segura de DOM
//   main.js           -> este archivo: orquesta pantallas y estados
//
// Regla transversal: la UI NUNCA es la autorización. Ocultar un botón solo
// evita ofrecer acciones que sabemos que fallarán; el backend decide de nuevo
// y sus 403/404/409 se muestran tal cual cuando ocurren.
// ============================================================================

import * as session from './session.js';
import * as requestsApi from './requests-api.js';
import { describeError, errorBadge } from './errors.js';
import { el, clear, setMessage, formatDate, shortId, roleLabel } from './ui.js';
import {
  STATUSES,
  PRIORITIES,
  STATUS_LABEL,
  PRIORITY_LABEL,
  isTerminal,
  availableTransitions,
  canEditContent,
  canChangePriority,
  canChangeStatus,
  canCreateRequest
} from './domain.js';

// ---------------------------------------------------------------------------
// Referencias del DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const dom = {
  sessionBar: $('session-bar'),
  sessionUser: $('session-user'),
  sessionRole: $('session-role'),
  logoutBtn: $('logout-btn'),
  authView: $('auth-view'),
  appView: $('app-view'),
  loginForm: $('login-form'),
  registerForm: $('register-form'),
  loginFeedback: $('login-feedback'),
  registerFeedback: $('register-feedback'),
  tabLogin: $('tab-login'),
  tabRegister: $('tab-register'),
  // Solicitante
  createPanel: $('create-panel'),
  createForm: $('create-form'),
  createFeedback: $('create-feedback'),
  listPanel: $('list-panel'),
  listHeading: $('list-heading'),
  filterStatus: $('filter-status'),
  filterPriority: $('filter-priority'),
  clearFilters: $('clear-filters'),
  listFeedback: $('list-feedback'),
  requestsList: $('requests-list'),
  // Detalle
  detailPanel: $('detail-panel'),
  detailBody: $('detail-body'),
  detailFeedback: $('detail-feedback'),
  closeDetail: $('close-detail')
};

// Estado de la vista (filtros y detalle abierto). La sesión vive en session.js.
const view = { filters: { status: '', priority: '' }, selectedId: null };

// ---------------------------------------------------------------------------
// Utilidades de estado de interfaz
// ---------------------------------------------------------------------------

/** Aplica un resultado {status, body} de error a un nodo de feedback. */
function showError(node, result) {
  const described = describeError(result.status, result.body);
  setMessage(node, { text: described.message, kind: 'error', badge: errorBadge(result.status) });
}
function showOk(node, text) {
  setMessage(node, { text, kind: 'ok' });
}
function showInfo(node, text) {
  setMessage(node, { text, kind: 'info' });
}
function showLoading(node, text = 'Cargando…') {
  setMessage(node, { text, kind: 'loading' });
}
function clearFeedback(node) {
  setMessage(node, { text: '' });
}

// ---------------------------------------------------------------------------
// Barra de sesión
// ---------------------------------------------------------------------------
function renderSessionBar() {
  const user = session.getUser();
  if (!user) {
    dom.sessionBar.dataset.state = 'anonymous';
    dom.sessionUser.textContent = 'Sin sesión';
    dom.sessionRole.textContent = '';
    dom.logoutBtn.hidden = true;
    return;
  }
  dom.sessionBar.dataset.state = 'authenticated';
  dom.sessionUser.textContent = user.email;
  dom.sessionRole.textContent = roleLabel(user.role);
  dom.sessionRole.dataset.role = user.role;
  dom.logoutBtn.hidden = false;
}

// ---------------------------------------------------------------------------
// Pantalla de autenticación (login / registro)
// ---------------------------------------------------------------------------
function switchAuthTab(which) {
  const isLogin = which === 'login';
  dom.loginForm.hidden = !isLogin;
  dom.registerForm.hidden = isLogin;
  dom.tabLogin.setAttribute('aria-selected', String(isLogin));
  dom.tabRegister.setAttribute('aria-selected', String(!isLogin));
  dom.tabLogin.classList.toggle('is-active', isLogin);
  dom.tabRegister.classList.toggle('is-active', !isLogin);
  clearFeedback(dom.loginFeedback);
  clearFeedback(dom.registerFeedback);
}

dom.tabLogin.addEventListener('click', () => switchAuthTab('login'));
dom.tabRegister.addEventListener('click', () => switchAuthTab('register'));

dom.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(dom.loginForm);
  const email = data.get('email');
  const password = data.get('password');

  showLoading(dom.loginFeedback, 'Entrando…');
  const result = await session.login({ email, password });

  if (!result.ok) {
    showError(dom.loginFeedback, result);
    return;
  }
  clearFeedback(dom.loginFeedback);
  onAuthenticated();
});

dom.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(dom.registerForm);
  const email = data.get('email');
  const password = data.get('password');

  showLoading(dom.registerFeedback, 'Creando cuenta…');
  const result = await session.register({ email, password });

  if (!result.ok) {
    showError(dom.registerFeedback, result);
    return;
  }
  // Cuenta creada: se entra automáticamente (el registro no da token, así que
  // se hace login con las mismas credenciales).
  showOk(dom.registerFeedback, 'Cuenta creada. Entrando…');
  const logged = await session.login({ email, password });
  if (!logged.ok) {
    showError(dom.registerFeedback, logged);
    switchAuthTab('login');
    return;
  }
  clearFeedback(dom.registerFeedback);
  onAuthenticated();
});

dom.logoutBtn.addEventListener('click', () => {
  // Logout LOCAL (documentado): olvida el token aquí; el JWT sigue válido
  // en el servidor hasta expirar. Volvemos a la pantalla de autenticación.
  session.logout();
  view.selectedId = null;
  closeDetail();
  renderSessionBar();
  dom.appView.hidden = true;
  dom.authView.hidden = false;
  switchAuthTab('login');
});

// ---------------------------------------------------------------------------
// Transición a la app autenticada
// ---------------------------------------------------------------------------
function onAuthenticated() {
  const user = session.getUser();
  renderSessionBar();
  dom.authView.hidden = true;
  dom.appView.hidden = false;

  const isRequester = canCreateRequest(user);
  dom.createPanel.hidden = !isRequester;      // el agent no crea
  dom.listPanel.hidden = false;

  dom.listHeading.textContent = isRequester ? 'Mis solicitudes' : 'Todas las solicitudes';
  dom.createFeedback && clearFeedback(dom.createFeedback);

  loadRequests();
}

// ---------------------------------------------------------------------------
// Lista de solicitudes (con filtros y todos los estados de interfaz)
// ---------------------------------------------------------------------------
function requestStatusBadge(request) {
  return el('span', {
    className: `badge status-${request.status}`,
    text: STATUS_LABEL[request.status] ?? request.status
  });
}
function requestPriorityBadge(request) {
  return el('span', {
    className: `badge priority-${request.priority}`,
    text: PRIORITY_LABEL[request.priority] ?? request.priority
  });
}

async function loadRequests() {
  clear(dom.requestsList);
  showLoading(dom.listFeedback);

  const result = await requestsApi.listRequests(view.filters);

  if (result.status !== 200) {
    showError(dom.listFeedback, result);
    return;
  }

  const requests = result.body ?? [];

  // Estado EMPTY (distinto de loading, de error y de success).
  if (requests.length === 0) {
    const hasFilters = view.filters.status || view.filters.priority;
    setMessage(dom.listFeedback, {
      text: hasFilters
        ? 'No hay solicitudes que coincidan con esos filtros.'
        : 'Todavía no hay solicitudes. Crea la primera.',
      kind: 'empty'
    });
    return;
  }

  // Estado SUCCESS.
  setMessage(dom.listFeedback, {
    text: `${requests.length} solicitud(es).`,
    kind: 'ok'
  });

  for (const request of requests) {
    dom.requestsList.append(renderRequestRow(request));
  }
}

function renderRequestRow(request) {
  const title = el('span', { className: 'request-title', text: `#${request.id} · ${request.title}` });
  const meta = el('span', { className: 'request-meta' });

  const isRequester = session.getUser()?.role === 'requester';
  const canEdit = canEditContent(session.getUser(), request);

  meta.append(requestStatusBadge(request), requestPriorityBadge(request));

  // Pista para el solicitante: por qué no puede editar (propiedad/estado).
  let hint = null;
  if (isRequester && !canEdit) {
    hint = el('span', {
      className: 'request-hint',
      text: request.status !== 'open' ? 'solo editable mientras está abierta' : '—'
    });
  }

  const openBtn = el('button', {
    type: 'button',
    className: 'link-btn',
    text: 'Ver detalle'
  });
  openBtn.addEventListener('click', () => openDetail(request.id));

  const li = el('li', {
    className: 'request-row',
    attrs: { 'data-id': request.id }
  });
  const left = el('div', { className: 'request-row-main', children: [title, meta] });
  if (hint) left.append(hint);
  li.append(left, openBtn);
  return li;
}

// Filtros
function applyFilters() {
  view.filters = {
    status: dom.filterStatus.value,
    priority: dom.filterPriority.value
  };
  loadRequests();
}
dom.filterStatus.addEventListener('change', applyFilters);
dom.filterPriority.addEventListener('change', applyFilters);
dom.clearFilters.addEventListener('click', () => {
  dom.filterStatus.value = '';
  dom.filterPriority.value = '';
  applyFilters();
});

// ---------------------------------------------------------------------------
// Crear solicitud (solo requester)
// ---------------------------------------------------------------------------
if (dom.createForm) {
  dom.createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(dom.createForm);
    const title = String(data.get('title') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const priority = data.get('priority');

    // Validación amable en cliente (el servidor vuelve a validar de todos modos).
    if (!title) {
      setMessage(dom.createFeedback, {
        text: 'El título no puede estar vacío.',
        kind: 'error',
        badge: 'HTTP 400'
      });
      return;
    }

    showLoading(dom.createFeedback, 'Creando…');
    // NO se envía createdBy ni status: los decide el servidor.
    const result = await requestsApi.createRequest({ title, description, priority });

    if (result.status !== 201) {
      showError(dom.createFeedback, result);
      return;
    }
    showOk(dom.createFeedback, `Solicitud #${result.body.id} creada.`);
    dom.createForm.reset();
    loadRequests();
  });
}

// ---------------------------------------------------------------------------
// Detalle + historial + acciones (edición condicionada, agent)
// ---------------------------------------------------------------------------
async function openDetail(id) {
  view.selectedId = id;
  dom.detailPanel.hidden = false;
  clear(dom.detailBody);
  showLoading(dom.detailFeedback, 'Cargando detalle…');

  // Dos peticiones reales: el detalle y su historial.
  const [detail, history] = await Promise.all([
    requestsApi.getRequest(id),
    requestsApi.getHistory(id)
  ]);

  if (detail.status !== 200) {
    showError(dom.detailFeedback, detail);
    return;
  }
  clearFeedback(dom.detailFeedback);
  renderDetail(detail.body, history.status === 200 ? history.body : []);
  dom.detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDetail() {
  view.selectedId = null;
  dom.detailPanel.hidden = true;
  clear(dom.detailBody);
}

dom.closeDetail.addEventListener('click', closeDetail);

function field(label, value) {
  return el('div', { className: 'field', children: [
    el('span', { className: 'field-label', text: label }),
    el('span', { className: 'field-value', text: value })
  ] });
}

function renderDetail(request, history) {
  const actor = session.getUser();
  clear(dom.detailBody);

  // --- Encabezado ---
  dom.detailBody.append(el('h3', { className: 'detail-title', text: `#${request.id} · ${request.title}` }));

  const badges = el('div', { className: 'badges' });
  badges.append(requestStatusBadge(request), requestPriorityBadge(request));
  dom.detailBody.append(badges);

  // --- Datos ---
  const grid = el('div', { className: 'field-grid' });
  grid.append(
    field('Descripción', request.description ?? '(sin descripción)'),
    field('Creado', formatDate(request.createdAt)),
    field('Actualizado', formatDate(request.updatedAt)),
    field('Dueño', request.createdBy ? shortId(request.createdBy) : 'heredada (sin dueño)')
  );
  dom.detailBody.append(grid);

  // --- Acciones del solicitante: editar contenido si propia y abierta ---
  if (canEditContent(actor, request)) {
    dom.detailBody.append(renderContentEditor(request));
  } else if (actor.role === 'requester' && request.createdBy === actor.userId) {
    dom.detailBody.append(el('p', {
      className: 'note',
      text: 'No puedes editar el contenido: la solicitud ya no está abierta (un agente la está trabajando o cerró).'
    }));
  } else if (actor.role === 'requester') {
    dom.detailBody.append(el('p', {
      className: 'note',
      text: 'Esta solicitud no es tuya: solo lectura.'
    }));
  }

  // --- Acciones del agent: prioridad y estado ---
  if (canChangePriority(actor) || canChangeStatus(actor)) {
    dom.detailBody.append(renderAgentActions(request));
  }

  // --- Historial (auditoría) ---
  dom.detailBody.append(renderHistory(history));
}

function renderContentEditor(request) {
  const form = el('form', { className: 'inline-form' });
  const titleInput = el('input', { attrs: { name: 'title', value: request.title, required: true } });
  const descInput = el('input', {
    attrs: { name: 'description', value: request.description ?? '', placeholder: 'Descripción (opcional)' }
  });
  const save = el('button', { type: 'submit', text: 'Guardar cambios' });
  const feedback = el('p', { className: 'feedback' });

  form.append(
    el('label', { children: [document.createTextNode('Título'), titleInput] }),
    el('label', { children: [document.createTextNode('Descripción'), descInput] }),
    save,
    feedback
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = String(new FormData(form).get('title') ?? '').trim();
    const description = String(new FormData(form).get('description') ?? '').trim();
    if (!title) {
      setMessage(feedback, { text: 'El título no puede estar vacío.', kind: 'error', badge: 'HTTP 400' });
      return;
    }
    showLoading(feedback, 'Guardando…');
    const result = await requestsApi.updateRequest(request.id, { title, description });
    if (result.status !== 200) {
      // 403 (ya no abierta / no es tuya), 409, etc. se muestran tal cual.
      showError(feedback, result);
      return;
    }
    showOk(feedback, 'Guardado.');
    openDetail(request.id);
    loadRequests();
  });

  return el('section', { className: 'detail-actions', children: [
    el('h4', { text: 'Editar contenido' }),
    form
  ]});
}

function renderAgentActions(request) {
  const section = el('section', { className: 'detail-actions' });
  section.append(el('h4', { text: 'Acciones de agente' }));

  // Cambio de prioridad (solo se ofrece si el actor es agent).
  if (canChangePriority(session.getUser())) {
    const select = el('select', { attrs: { name: 'priority' } });
    for (const p of PRIORITIES) {
      const opt = el('option', { text: PRIORITY_LABEL[p], attrs: { value: p } });
      if (p === request.priority) opt.selected = true;
      select.append(opt);
    }
    const btn = el('button', { type: 'button', text: 'Cambiar prioridad' });
    const feedback = el('p', { className: 'feedback' });
    btn.addEventListener('click', async () => {
      showLoading(feedback, 'Actualizando prioridad…');
      const result = await requestsApi.updateRequest(request.id, { priority: select.value });
      if (result.status !== 200) { showError(feedback, result); return; }
      showOk(feedback, 'Prioridad actualizada.');
      openDetail(request.id);
      loadRequests();
    });
    section.append(el('div', { className: 'inline-form', children: [select, btn, feedback] }));
  }

  // Cambio de estado: SOLO las transiciones disponibles desde el estado actual.
  if (canChangeStatus(session.getUser())) {
    const transitions = availableTransitions(request.status);
    if (isTerminal(request.status) || transitions.length === 0) {
      section.append(el('p', {
        className: 'note',
        text: 'Esta solicitud está en un estado terminal: no admite más cambios de estado.'
      }));
    } else {
      const select = el('select', { attrs: { name: 'status' } });
      for (const s of transitions) {
        select.append(el('option', { text: STATUS_LABEL[s] ?? s, attrs: { value: s } }));
      }
      const btn = el('button', { type: 'button', text: 'Cambiar estado' });
      const feedback = el('p', { className: 'feedback' });
      btn.addEventListener('click', async () => {
        showLoading(feedback, 'Cambiando estado…');
        const result = await requestsApi.updateRequest(request.id, { status: select.value });
        if (result.status !== 200) {
          // 409 en caso de conflicto real (la realidad cambió desde esta vista).
          showError(feedback, result);
          if (result.status === 409) openDetail(request.id);
          return;
        }
        showOk(feedback, 'Estado actualizado.');
        openDetail(request.id);
        loadRequests();
      });
      section.append(el('div', { className: 'inline-form', children: [select, btn, feedback] }));
    }
  }

  return section;
}

function renderHistory(history) {
  const section = el('section', { className: 'detail-actions' });
  section.append(el('h4', { text: 'Historial (auditoría)' }));

  if (!history || history.length === 0) {
    section.append(el('p', { className: 'note', text: 'Sin eventos registrados.' }));
    return section;
  }

  const list = el('ol', { className: 'history' });
  // Más reciente primero para lectura; el backend los da del más antiguo.
  for (const event of [...history].reverse()) {
    const from = event.previousStatus ? (STATUS_LABEL[event.previousStatus] ?? event.previousStatus) : 'nacimiento';
    const to = STATUS_LABEL[event.newStatus] ?? event.newStatus;
    const who = event.changedBy ? shortId(event.changedBy) : '—';
    list.append(el('li', {
      children: [
        el('span', { className: 'history-move', text: `${from} → ${to}` }),
        el('span', { className: 'history-meta', text: `${formatDate(event.changedAt)} · por ${who}` })
      ]
    }));
  }
  section.append(list);
  return section;
}

// ---------------------------------------------------------------------------
// Arranque: si ya hay sesión (no debería tras recargar, token en memoria),
// se entra directo; si no, la pantalla de autenticación.
// ---------------------------------------------------------------------------
function boot() {
  renderSessionBar();
  switchAuthTab('login');
  if (session.isAuthenticated()) {
    onAuthenticated();
  } else {
    dom.authView.hidden = false;
    dom.appView.hidden = true;
  }
}

boot();
