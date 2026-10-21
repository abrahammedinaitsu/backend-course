// Coordination layer for the requests module. Since class 5 every
// operation receives the authenticated actor: the service applies the
// module policy, keeps the use-case rules from classes 3-4, and defines
// units of work. No SQL, no HTTP status codes.

import { withTransaction } from '../../database/transaction.js';
import {
  findAll,
  findById,
  insertRequest,
  updateRequest,
  insertHistoryEvent,
  findHistory
} from './requests.store.js';
import { mapRequestRow, mapHistoryEventRow } from './request.mapper.js';
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
import { AppError } from '../../app-error.js';

const PRIORITIES = ['low', 'medium', 'high'];
const UPDATABLE_FIELDS = ['title', 'description', 'priority', 'status'];

// Fields the server controls on requests. Sending them is a contract
// violation, answered explicitly — never silently ignored.
const SERVER_CONTROLLED_FIELDS = ['id', 'createdBy', 'createdAt', 'updatedAt', 'changedBy'];

// A foreign resource answers exactly like a missing one: same status,
// same code, same message. A different answer would confirm it exists.
function notFound(id) {
  return new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
}

function forbidden(message) {
  return new AppError('forbidden', 'FORBIDDEN', message);
}

function rejectServerControlledFields(body, extra = []) {
  for (const field of [...SERVER_CONTROLLED_FIELDS, ...extra]) {
    if (body && field in body) {
      throw new AppError('contract', 'SERVER_CONTROLLED_FIELD',
        `The field "${field}" is controlled by the server.`);
    }
  }
}

export async function listRequests(actor, filters) {
  if (filters.status !== undefined && !isValidStatus(filters.status)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown status "${filters.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (filters.priority !== undefined && !PRIORITIES.includes(filters.priority)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown priority "${filters.priority}". Valid values: ${PRIORITIES.join(', ')}.`);
  }

  // Agents see the whole collection; requesters see their own, scoped in
  // the SQL itself — the WHERE lives in the store, not in JavaScript.
  const scope = canListAllRequests(actor)
    ? filters
    : { ...filters, createdBy: actor.userId };

  const rows = await findAll(scope);
  return rows.map(mapRequestRow);
}

export async function getRequest(actor, id) {
  const row = await findById(id);
  if (!row) throw notFound(id);

  const request = mapRequestRow(row);
  if (!canViewRequest(actor, request)) throw notFound(id);
  return request;
}

export async function createRequest(actor, input) {
  if (!canCreateRequest(actor)) {
    throw forbidden('Only requesters can create requests.');
  }

  // status is also server-controlled at creation: a request is born open.
  rejectServerControlledFields(input, ['status']);

  const { title, description, priority } = input ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    throw new AppError('contract', 'TITLE_REQUIRED', 'A request needs a non-empty title.');
  }

  // Creation is a unit of work: the request AND its birth history
  // (NULL -> open) happen together or not at all. The owner and the
  // history actor come from the authenticated identity.
  const row = await withTransaction(async (client) => {
    const created = await insertRequest({
      title: title.trim(),
      description: typeof description === 'string' ? description : null,
      priority: priority ?? 'medium',
      createdBy: actor.userId
    }, client);
    await insertHistoryEvent({
      requestId: created.id,
      type: 'status_changed',
      fromStatus: null,
      toStatus: created.status,
      changedBy: actor.userId
    }, client);
    return created;
  });

  return mapRequestRow(row);
}

export async function patchRequest(actor, id, body) {
  rejectServerControlledFields(body);

  const changes = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body?.[field] !== undefined) changes[field] = body[field];
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError('contract', 'NO_UPDATABLE_FIELDS',
      `The body must include at least one of: ${UPDATABLE_FIELDS.join(', ')}.`);
  }
  if (changes.title !== undefined && (typeof changes.title !== 'string' || changes.title.trim() === '')) {
    throw new AppError('contract', 'TITLE_REQUIRED', 'The title cannot be empty.');
  }
  if (changes.status !== undefined && !isValidStatus(changes.status)) {
    throw new AppError('contract', 'INVALID_STATUS',
      `Unknown status "${changes.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (changes.title !== undefined) changes.title = changes.title.trim();

  // Read, authorize against the CURRENT state, validate, write and record
  // history — all with the same client, as one unit of work.
  const row = await withTransaction(async (client) => {
    const current = await findById(id, client);
    if (!current) throw notFound(id);

    const request = mapRequestRow(current);
    if (!canViewRequest(actor, request)) throw notFound(id);

    // Authorization is all-or-nothing: a body mixing an allowed change
    // with a forbidden one is rejected whole. No partial surprises.
    const wantsContent = changes.title !== undefined || changes.description !== undefined;
    const wantsPriority = changes.priority !== undefined;
    const wantsStatus = changes.status !== undefined;

    if (wantsContent && !canEditContent(actor, request)) {
      throw forbidden('Only the owner can edit title and description, and only while the request is open.');
    }
    if (wantsPriority && !canChangePriority(actor)) {
      throw forbidden('Only agents can change the priority.');
    }
    if (wantsStatus && !canChangeStatus(actor)) {
      throw forbidden('Only agents can change the status.');
    }

    // The rules from classes 3-4 still apply — to every role.
    if (isTerminal(current.status)) {
      throw new AppError('domain', 'REQUEST_IN_TERMINAL_STATUS',
        `Request ${id} is ${current.status} and can no longer be modified.`);
    }

    const statusChanges = changes.status !== undefined && changes.status !== current.status;
    if (statusChanges && !canTransition(current.status, changes.status)) {
      throw new AppError('domain', 'INVALID_STATUS_TRANSITION',
        `A request cannot move from ${current.status} to ${changes.status}.`);
    }

    const updated = await updateRequest(id, changes, client);
    // The history actor is the authenticated identity — changedBy can
    // never arrive from the body. Each kind of change leaves its own event.
    if (statusChanges) {
      await insertHistoryEvent({
        requestId: id,
        type: 'status_changed',
        fromStatus: current.status,
        toStatus: changes.status,
        changedBy: actor.userId
      }, client);
    }
    if (changes.priority !== undefined && changes.priority !== current.priority) {
      await insertHistoryEvent({
        requestId: id,
        type: 'priority_changed',
        fromPriority: current.priority,
        toPriority: changes.priority,
        changedBy: actor.userId
      }, client);
    }
    return updated;
  });

  return mapRequestRow(row);
}

export async function getHistory(actor, id) {
  const row = await findById(id);
  if (!row) throw notFound(id);

  const request = mapRequestRow(row);
  if (!canViewHistory(actor, request)) throw notFound(id);

  const rows = await findHistory(id);
  return rows.map(mapHistoryEventRow);
}
