// The service coordinates. It exists because ONE operation now spans five steps and a
// transaction: read previous status -> protect the transition -> update -> record history ->
// all in one unit -> return the result. That coordination is not HTTP (not routes), not a
// query (not the store), not a pure rule (not request-status). It needs its own place.
//
// The service does NOT know what a status code is: it throws typed errors and routes translate
// them. Each layer speaks its own language.
import * as store from './requests.store.js';
import { mapRequestRow, mapHistoryRow } from './request.mapper.js';
import { isValidStatus, isTerminal, canTransition } from './request-status.js';
import { withTransaction } from '../../database/transaction.js';

const PRIORITIES = ['low', 'medium', 'high'];

// Typed errors the route layer knows how to translate. They carry the machine `code` and the
// HTTP status, so the translation table lives in one place.
export class HttpError extends Error {
  constructor(httpStatus, code, message) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

const contract = (code, message) => new HttpError(400, code, message);
const notFound = (message = 'Request not found') =>
  new HttpError(404, 'REQUEST_NOT_FOUND', message);

// GET /requests -> collection of representations.
export async function listRequests(filters) {
  const rows = await store.findAll(filters);
  return rows.map(mapRequestRow);
}

// GET /requests/:id -> representation, or 404.
export async function getRequest(id) {
  const row = await store.findById(id);
  if (!row) throw notFound();
  return mapRequestRow(row);
}

// POST /requests -> created representation.
// The request and the record of its birth form ONE unit: a request must not exist without the
// row that records it was born. This is why create opens a transaction too.
export async function createRequest({ title, description, priority }) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw contract('TITLE_REQUIRED', 'Title is required');
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    throw contract('INVALID_PRIORITY', `Unknown priority: ${priority}`);
  }

  const row = await withTransaction(async (client) => {
    // id, status and timestamps are decided by the server/database; client values are ignored.
    const created = await store.create(
      { title: title.trim(), description, priority },
      client
    );
    // Record the birth: NULL -> open.
    await store.insertHistory(created.id, null, created.status, client);
    return created;
  });

  return mapRequestRow(row);
}

// PATCH /requests/:id -> updated representation.
export async function updateRequest(id, changes) {
  const current = await store.findById(id);
  if (!current) throw notFound();

  // A terminal request cannot be modified at all, not even its title. -> 409
  if (isTerminal(current.status)) {
    throw new HttpError(
      409,
      'REQUEST_IN_TERMINAL_STATUS',
      `Request is ${current.status} and cannot be modified`
    );
  }

  const { title, description, priority, status } = changes;

  const hasModifiableField =
    title !== undefined ||
    description !== undefined ||
    priority !== undefined ||
    status !== undefined;

  if (!hasModifiableField) {
    throw contract('NOTHING_TO_UPDATE', 'No modifiable fields in the body');
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    throw contract('TITLE_REQUIRED', 'Title is required');
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    throw contract('INVALID_PRIORITY', `Unknown priority: ${priority}`);
  }

  // Fields other than status: a single UPDATE, no transaction needed.
  const fieldChanges = {};
  if (title !== undefined) fieldChanges.title = title.trim();
  if (description !== undefined) fieldChanges.description = description;
  if (priority !== undefined) fieldChanges.priority = priority;

  if (status === undefined) {
    const row = await store.update(id, fieldChanges);
    if (!row) throw notFound();
    return mapRequestRow(row);
  }

  // status present: validate it against the state machine BEFORE writing anything.
  if (!isValidStatus(status)) {
    // Unknown value: the request is malformed in itself. -> 400
    throw contract('INVALID_STATUS_TRANSITION', `Unknown status: ${status}`);
  }
  if (!canTransition(current.status, status)) {
    // Known value the current state forbids: well-formed request, impossible state. -> 409
    throw new HttpError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot change status from ${current.status} to ${status}`
    );
  }

  // A status change plus other fields is still one unit: update the row and record the event
  // together. If the history insert fails, the status change is rolled back.
  const row = await withTransaction(async (client) => {
    if (Object.keys(fieldChanges).length > 0) {
      await store.update(id, fieldChanges, client);
    }
    const updated = await store.updateStatus(id, status, client);
    await store.insertHistory(id, current.status, status, client);
    return updated;
  });

  return mapRequestRow(row);
}

// GET /requests/:id/history -> array of events.
// Distinguishes "request does not exist" (404) from "request exists with empty history" (200 []).
export async function getRequestHistory(id) {
  const row = await store.findById(id);
  if (!row) throw notFound();

  const events = await store.findHistory(id);
  return events.map(mapHistoryRow);
}
