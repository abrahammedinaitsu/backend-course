// El service coordina. Existe porque UNA operación ahora abarca varios pasos y una transacción:
// leer el estado previo -> autorizar contra la fila actual -> actualizar -> registrar la
// historia -> todo en una unidad -> devolver el resultado. Esa coordinación no es HTTP (rutas),
// no es una consulta (store) ni una regla pura (request-status/policy). Necesita su lugar.
//
// El service NO sabe qué es un código de estado HTTP: lanza errores tipados (AppError) y la
// capa HTTP los traduce en un único punto (src/http/respond-error.js).
//
// Cambios de la clase 05 (estaciones 6 y 7):
//   * cada operación recibe el ACTOR primero (req.auth, del token verificado);
//   * los campos controlados por el servidor se rechazan EXPLÍCITAMENTE (400);
//   * createdBy/changedBy salen del actor, jamás del body;
//   * la colección del requester se acota en SQL (createdBy en el store);
//   * el recurso ajeno responde el MISMO 404 que el inexistente;
//   * la política se aplica TODO-O-NADA antes de escribir nada.
import { AppError } from '../../app-error.js';
import { withTransaction } from '../../database/transaction.js';
import {
  findAll,
  findById,
  insertRequest,
  updateRequest,
  insertStatusHistory,
  findHistory
} from './requests.store.js';
import { mapRequestRow, mapHistoryRow } from './request.mapper.js';
import { STATUSES, isValidStatus, isTerminal, canTransition } from './request-status.js';
import {
  canListAllRequests,
  canViewRequest,
  canViewHistory,
  canCreateRequest,
  canEditContent,
  canChangePriority,
  canChangeStatus
} from './request.policy.js';

const PRIORITIES = ['low', 'medium', 'high'];
const UPDATABLE_FIELDS = ['title', 'description', 'priority', 'status'];

// Campos que el cliente NUNCA decide: identidad, dueño, actor y marcas de tiempo.
// `status` se controla solo en la CREACIÓN (una solicitud nace abierta).
const SERVER_CONTROLLED_FIELDS = ['id', 'createdBy', 'createdAt', 'updatedAt', 'changedBy'];

function assertValidPriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    throw new AppError('contract', 'INVALID_PRIORITY',
      `Unknown priority "${priority}". Valid values: ${PRIORITIES.join(', ')}.`);
  }
}

// Rechazo EXPLÍCITO de campos controlados por el servidor. Ignorarlos en silencio enseñaría
// que intentar es gratis; el contrato los prohíbe y el mensaje lo dice.
function assertNoServerControlledFields(body, extra = []) {
  const forbidden = [...SERVER_CONTROLLED_FIELDS, ...extra];
  for (const field of forbidden) {
    if (body?.[field] !== undefined) {
      throw new AppError('contract', 'SERVER_CONTROLLED_FIELD',
        `The field "${field}" is controlled by the server and cannot be sent.`);
    }
  }
}

// GET /requests -> colección de representaciones.
// Requester: solo lo propio (el acotamiento vive en SQL). Agent: todo, incluidas las heredadas.
export async function listRequests(actor, filters = {}) {
  if (filters.status !== undefined && !isValidStatus(filters.status)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown status "${filters.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (filters.priority !== undefined && !PRIORITIES.includes(filters.priority)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown priority "${filters.priority}". Valid values: ${PRIORITIES.join(', ')}.`);
  }

  const scope = canListAllRequests(actor) ? {} : { createdBy: actor.userId };
  const rows = await findAll({ ...filters, ...scope });
  return rows.map(mapRequestRow);
}

// GET /requests/:id -> representación, o 404.
// El recurso ajeno responde EXACTAMENTE el mismo 404 que el inexistente: un 403 confirmaría
// que existe (enumeración gratis).
export async function getRequest(actor, id) {
  const row = await findById(id);
  if (!row || !canViewRequest(actor, mapRequestRow(row))) {
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }
  return mapRequestRow(row);
}

// POST /requests -> representación creada.
// La solicitud y el registro de su nacimiento forman UNA unidad: no debe existir sin la fila
// que registra que nació. Por eso crear también abre una transacción.
export async function createRequest(actor, input) {
  // `status` al crear también es del servidor: una solicitud nace abierta.
  assertNoServerControlledFields(input, ['status']);

  const { title, description, priority } = input ?? {};

  if (!canCreateRequest(actor)) {
    throw new AppError('forbidden', 'FORBIDDEN', 'Your role cannot create requests.');
  }
  if (typeof title !== 'string' || title.trim() === '') {
    throw new AppError('contract', 'TITLE_REQUIRED', 'A request needs a non-empty title.');
  }
  if (priority !== undefined) assertValidPriority(priority);

  const row = await withTransaction(async (client) => {
    const created = await insertRequest({
      title: title.trim(),
      description: typeof description === 'string' ? description : null,
      priority: priority ?? 'medium',
      // El dueño sale del token verificado, NUNCA del body.
      createdBy: actor.userId
    }, client);
    // Nacimiento: NULL -> open. El creador queda como actor de ese primer evento.
    await insertStatusHistory(created.id, null, created.status, actor.userId, client);
    return created;
  });

  return mapRequestRow(row);
}

// PATCH /requests/:id -> representación actualizada.
export async function patchRequest(actor, id, body) {
  assertNoServerControlledFields(body);

  const changes = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body?.[field] !== undefined) changes[field] = body[field];
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError('contract', 'NOTHING_TO_UPDATE',
      `The body must include at least one of: ${UPDATABLE_FIELDS.join(', ')}.`);
  }
  if (changes.title !== undefined && (typeof changes.title !== 'string' || changes.title.trim() === '')) {
    throw new AppError('contract', 'TITLE_REQUIRED', 'The title cannot be empty.');
  }
  if (changes.priority !== undefined) assertValidPriority(changes.priority);
  if (changes.status !== undefined && !isValidStatus(changes.status)) {
    throw new AppError('contract', 'INVALID_STATUS',
      `Unknown status "${changes.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (changes.title !== undefined) changes.title = changes.title.trim();

  // Leer, autorizar contra la fila actual, escribir y registrar historia — todo con el mismo
  // cliente, como una unidad. La autorización ocurre DENTRO de la transacción, con la fila
  // delante: ¿contra qué estado decidirías si no?
  const row = await withTransaction(async (client) => {
    const current = await findById(id, client);
    if (!current) {
      throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
    }

    const request = mapRequestRow(current);

    // Primero visibilidad (404), después permiso (403): si no debes saber que existe, no hay
    // conversación sobre permisos.
    // Nota: un dueño puede ver su propia solicitud; si no la ve, es como si no existiera.
    if (!canViewRequest(actor, request)) {
      throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
    }

    // Autorización TODO-O-NADA: si el body mezcla un campo permitido con uno prohibido, se
    // rechaza ENTERO y no se aplica ninguna parte (nada de actualizaciones parciales sorpresa).
    const touchesContent = changes.title !== undefined || changes.description !== undefined;
    const touchesPriority = changes.priority !== undefined;
    const touchesStatus = changes.status !== undefined && changes.status !== current.status;

    if (touchesContent && !canEditContent(actor, request)) {
      throw new AppError('forbidden', 'FORBIDDEN',
        'Editing the content requires being the owner while the request is open.');
    }
    if (touchesPriority && !canChangePriority(actor)) {
      throw new AppError('forbidden', 'FORBIDDEN', 'Your role cannot change the priority.');
    }
    if (touchesStatus && !canChangeStatus(actor)) {
      throw new AppError('forbidden', 'FORBIDDEN', 'Your role cannot change the status.');
    }

    // Reglas de dominio (clase 03): siguen vigentes para TODOS los roles.
    if (isTerminal(current.status)) {
      throw new AppError('domain', 'REQUEST_IN_TERMINAL_STATUS',
        `Request ${id} is ${current.status} and can no longer be modified.`);
    }
    if (changes.status !== undefined && changes.status !== current.status
        && !canTransition(current.status, changes.status)) {
      throw new AppError('domain', 'INVALID_STATUS_TRANSITION',
        `A request cannot move from ${current.status} to ${changes.status}.`);
    }

    const updated = await updateRequest(id, changes, client);
    if (touchesStatus) {
      // El actor de la transición sale del token, nunca del body.
      await insertStatusHistory(id, current.status, changes.status, actor.userId, client);
    }
    return updated;
  });

  return mapRequestRow(row);
}

// GET /requests/:id/history -> arreglo de eventos.
// Distingue "la solicitud no existe" (404) de "existe con historia vacía" (200 []).
// El historial es tan privado como la solicitud: misma regla de visibilidad.
export async function getHistory(actor, id) {
  const row = await findById(id);
  if (!row || !canViewHistory(actor, mapRequestRow(row))) {
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }
  const rows = await findHistory(id);
  return rows.map(mapHistoryRow);
}
