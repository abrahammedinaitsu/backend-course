// ============================================================================
// Acceso a datos de solicitudes. Envuelve los endpoints REALES de la API.
//
// No inventa rutas ni campos. Lo que el backend no acepta (`createdBy`,
// `status` al crear, `changedBy`), el frontend no lo envía.
// ============================================================================

import { http } from './api.js';

/** Convierte filtros de UI en query string del contrato (?status=&priority=). */
function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** GET /requests — el backend acota por rol (propias vs. todas). */
export async function listRequests(filters = {}) {
  return http.get(`/requests${buildQuery(filters)}`);
}

/** GET /requests/:id */
export async function getRequest(id) {
  return http.get(`/requests/${id}`);
}

/** GET /requests/:id/history */
export async function getHistory(id) {
  return http.get(`/requests/${id}/history`);
}

/**
 * POST /requests — solo `title`, `description`, `priority`.
 * El `createdBy` sale del token en el servidor; aquí JAMÁS se envía.
 */
export async function createRequest({ title, description, priority }) {
  const body = { title };
  if (description !== undefined && description !== '') body.description = description;
  if (priority) body.priority = priority;
  return http.post('/requests', body);
}

/**
 * PATCH /requests/:id — solo los campos modificables del contrato.
 * Una llamada, un cambio: si se mezclan campos permitidos y prohibidos, el
 * backend rechaza TODO (403) y aquí no cambiaria nada.
 */
export async function updateRequest(id, changes) {
  const body = {};
  for (const field of ['title', 'description', 'priority', 'status']) {
    if (changes[field] !== undefined) body[field] = changes[field];
  }
  return http.patch(`/requests/${id}`, body);
}
