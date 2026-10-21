// ============================================================================
// Helper de DOM para /learn. Construye todo con `textContent` (nunca
// `innerHTML`), así el contenido se escapa por construcción.
// ============================================================================

export function el(tag, { className, text, attrs, children, html } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (attrs) for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'hidden') node.hidden = Boolean(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  if (children) for (const child of children) if (child) node.append(child);
  return node;
}

export function clear(node) {
  node.replaceChildren();
}
