// ============================================================================
// Entrega 05B — «El mundo de la autenticación».
// Renderiza los 20 contenidos, sus tablas/callouts, las interacciones y las
// fuentes. Navegación por barra lateral + scroll.
// ============================================================================

import { el, clear } from './dom.js';
import { TOPICS, SOURCE_GROUPS } from './content.js';
import { INTERACTIONS } from './interactions.js';

// --- Render seguro de una línea con **negrita** y `código` (sin innerHTML) ---
function richText(text) {
  const frag = document.createDocumentFragment();
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) frag.append(document.createTextNode(text.slice(last, match.index)));
    const token = match[0];
    if (token.startsWith('**')) frag.append(el('strong', { text: token.slice(2, -2) }));
    else frag.append(el('code', { className: 'inline-code', text: token.slice(1, -1) }));
    last = pattern.lastIndex;
  }
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  return frag;
}

const KIND_LABEL = {
  data: 'Dato',
  interpretation: 'Interpretación',
  recommendation: 'Recomendación',
  decision: 'Decisión'
};

function renderBlock(block) {
  if (block.type === 'p') {
    const p = el('p', { className: 'body-p' });
    p.append(richText(block.text));
    return p;
  }
  if (block.type === 'list') {
    return el('ul', { className: 'body-list', children: block.items.map((item) => {
      const li = el('li');
      li.append(richText(item));
      return li;
    }) });
  }
  if (block.type === 'callout') {
    const c = el('div', { className: `callout kind-${block.kind}` });
    c.append(el('span', { className: 'callout-kind', text: KIND_LABEL[block.kind] ?? block.kind }));
    const body = el('div', { className: 'callout-body' });
    body.append(richText(block.text));
    c.append(body);
    return c;
  }
  if (block.type === 'table') {
    const thead = el('thead', { children: [el('tr', { children: block.headers.map(h => el('th', { text: h })) })] });
    const tbody = el('tbody', { children: block.rows.map(row =>
      el('tr', { children: row.map(cell => el('td', { text: cell })) })
    ) });
    return el('div', { className: 'table-wrap', children: [el('table', { children: [thead, tbody] })] });
  }
  return null;
}

// --- Construcción de un tema ---
function renderTopic(topic) {
  const article = el('article', { className: 'topic', attrs: { id: `topic-${topic.id}` } });

  const head = el('header', { className: 'topic-head' });
  head.append(
    el('span', { className: 'topic-n', text: String(topic.n).padStart(2, '0') }),
    el('span', { className: 'topic-icon', text: topic.icon }),
    el('h2', { text: topic.title }),
    el('span', { className: 'topic-tag', text: topic.tag })
  );
  article.append(head, el('p', { className: 'topic-summary', text: topic.summary }));

  const body = el('div', { className: 'topic-body' });
  for (const block of topic.body) {
    const node = renderBlock(block);
    if (node) body.append(node);
  }
  article.append(body);

  // Interacciones significativas montadas en este tema.
  const mount = INTERACTIONS[topic.id];
  if (mount) {
    const zone = el('div', { className: 'interaction-zone' });
    for (const widget of mount()) zone.append(widget);
    article.append(zone);
  }

  // Fuentes por afirmación (si el tema las tiene).
  if (topic.sources && topic.sources.length) {
    article.append(el('footer', { className: 'topic-sources', children: [
      el('span', { className: 'sources-label', text: 'Fuentes de este tema: ' }),
      el('span', { text: topic.sources.join(' · ') })
    ] }));
  }

  return article;
}

function renderSourcesSection() {
  const section = el('section', { className: 'sources-section', attrs: { id: 'fuentes-full' } });
  section.append(el('h3', { text: 'Fuentes completas' }));
  section.append(el('p', { className: 'muted', text: 'Cada afirmación importante de arriba se ancla aquí. Se distingue dato · interpretación · recomendación · decisión con las etiquetas de los recuadros.' }));
  for (const group of SOURCE_GROUPS) {
    const g = el('div', { className: 'source-group' });
    g.append(el('h4', { text: group.kind }));
    const ul = el('ul', { className: 'source-list' });
    for (const item of group.items) {
      const li = el('li');
      const isUrl = /^https?:/.test(item.url);
      if (isUrl) {
        li.append(el('a', { text: item.label, attrs: { href: item.url, target: '_blank', rel: 'noopener noreferrer' } }));
      } else {
        li.append(el('span', { text: item.label }));
      }
      ul.append(li);
    }
    g.append(ul);
    section.append(g);
  }
  return section;
}

// --- Navegación lateral ---
function renderNav() {
  const nav = el('nav', { className: 'learn-nav', attrs: { 'aria-label': 'Contenidos' } });
  nav.append(el('p', { className: 'nav-title', text: '20 contenidos' }));
  const list = el('ul');
  for (const topic of TOPICS) {
    const a = el('a', { attrs: { href: `#topic-${topic.id}` }, children: [
      el('span', { className: 'nav-n', text: String(topic.n).padStart(2, '0') }),
      el('span', { text: topic.title })
    ] });
    list.append(el('li', { children: [a] }));
  }
  // Enlace a la sección de fuentes
  list.append(el('li', { children: [
    el('a', { attrs: { href: '#fuentes-full' }, children: [
      el('span', { className: 'nav-n', text: '★' }),
      el('span', { text: 'Fuentes completas' })
    ] })
  ] }));
  nav.append(list);
  return nav;
}

// --- Encabezado + estadísticas ---
function renderHero() {
  const hero = el('header', { className: 'learn-hero' });
  hero.append(
    el('p', { className: 'eyebrow', text: 'Entrega 05B · documentación interactiva' }),
    el('h1', { text: 'El mundo de la autenticación' }),
    el('p', { className: 'lead', text: 'Veinte contenidos sobre identidad, credenciales y delegación — con cinco interacciones que transforman el entendimiento, no solo lo decoran.' })
  );
  const stats = el('div', { className: 'stats' });
  stats.append(
    el('div', { className: 'stat', children: [el('strong', { text: '20' }), el('span', { text: 'contenidos' })] }),
    el('div', { className: 'stat', children: [el('strong', { text: '5' }), el('span', { text: 'interacciones' })] }),
    el('div', { className: 'stat', children: [el('strong', { text: '22' }), el('span', { text: 'fuentes' })] })
  );
  hero.append(stats);
  return hero;
}

// --- Arranque ---
function boot() {
  const app = document.getElementById('learn-app');
  clear(app);
  app.append(renderHero());

  const layout = el('div', { className: 'learn-layout' });
  layout.append(renderNav());

  const main = el('main', { className: 'learn-main' });
  for (const topic of TOPICS) main.append(renderTopic(topic));
  main.append(renderSourcesSection());
  layout.append(main);

  app.append(layout);

  // Marca el enlace activo según el scroll (progressive enhancement).
  const links = [...app.querySelectorAll('.learn-nav a')];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      for (const link of links) {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      }
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  for (const article of app.querySelectorAll('.topic, .sources-section')) observer.observe(article);
}

boot();
