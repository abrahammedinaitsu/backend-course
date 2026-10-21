// ============================================================================
// Helpers de interfaz. Todos construyen DOM con `textContent` (nunca
// `innerHTML` con datos del usuario): el contenido que viene de la API o del
// usuario se ESCAPA por construcción, no por recordar escaparlo.
// ============================================================================

/** Crea un elemento con clases, texto y atributos. */
export function el(tag, { className, text, attrs, children } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (attrs) for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'hidden') node.hidden = Boolean(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  if (children) for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

/** Vacía un contenedor. */
export function clear(node) {
  node.replaceChildren();
}

/** Muestra un mensaje de estado en un contenedor con una clase semántica. */
export function setMessage(node, { text = '', kind = null, badge = null } = {}) {
  clear(node);
  if (!text) {
    node.hidden = true;
    return;
  }
  node.hidden = false;
  node.className = `feedback${kind ? ` is-${kind}` : ''}`;
  if (badge) node.append(el('span', { className: 'feedback-badge', text: badge }));
  node.append(document.createTextNode(text));
}

/** Formatea una fecha ISO a algo legible en español. */
export function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** Acorta un UUID para mostrarlo sin ruido. */
export function shortId(uuid) {
  if (!uuid) return '—';
  return String(uuid).slice(0, 8);
}

/** Etiqueta de rol legible. */
export function roleLabel(role) {
  return role === 'agent' ? 'Agente' : role === 'requester' ? 'Solicitante' : role ?? '—';
}
