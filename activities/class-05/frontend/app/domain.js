// ============================================================================
// Conocimiento del dominio que la interfaz necesita para MOSTRAR bien.
//
// OJO: esto NO es autorización. Ocultar un botón no protege el backend — la
// API vuelve a decidir todo (y responde 403/404 igual si se llama directo).
// Aquí solo se evita ofrecer al usuario acciones que sabemos que fallarán, y
// se manejan los 409 cuando la realidad cambia.
//
// La máquina de estados es la MISMA de la clase 03 (no se reinventa).
// ============================================================================

export const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];
export const PRIORITIES = ['low', 'medium', 'high'];

export const STATUS_LABEL = {
  open: 'Abierta',
  in_progress: 'En progreso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
  cancelled: 'Cancelada'
};

export const PRIORITY_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };

// Estados terminales: no admiten más cambios (para ningún rol).
export const TERMINAL_STATUSES = ['closed', 'cancelled'];

// Transiciones válidas desde cada estado (idénticas a request-status.js del backend).
const TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['in_progress', 'closed'],
  closed: [],
  cancelled: []
};

export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/** Estados a los que se puede mover DESDE `status` (para el <select> del agent). */
export function availableTransitions(status) {
  return TRANSITIONS[status] ?? [];
}

// ---------------------------------------------------------------------------
// Autorización ESPEJO (solo para decidir qué mostrar). El servidor manda.
// ---------------------------------------------------------------------------

/**
 * ¿Puede este actor editar el CONTENIDO (título/descripción) de esta solicitud?
 * Requester + dueño + abierta. (Espejo de canEditContent del backend.)
 */
export function canEditContent(actor, request) {
  return (
    actor?.role === 'requester' &&
    request?.createdBy != null &&
    request.createdBy === actor.userId &&
    request.status === 'open'
  );
}

/** ¿Puede este actor cambiar prioridad/estado? Solo agent. */
export function canChangePriority(actor) {
  return actor?.role === 'agent';
}
export function canChangeStatus(actor) {
  return actor?.role === 'agent';
}

/** ¿Puede este actor crear solicitudes? Solo requester (el agent no crea). */
export function canCreateRequest(actor) {
  return actor?.role === 'requester';
}
