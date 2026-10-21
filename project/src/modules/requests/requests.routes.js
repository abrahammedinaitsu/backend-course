import express from 'express';
import {
  findAll,
  findById,
  add,
  generateId
} from './requests.store.js';
import {
  STATUSES,
  isValidStatus,
  isTerminal,
  canTransition
} from './request-status.js';

const router = express.Router();

// This router is mounted at /requests in app.js, so '/' here means GET /requests.

const PRIORITIES = ['low', 'medium', 'high'];

// Every error in this API has the same shape: { error: { code, message } }.
function sendError(res, httpStatus, code, message) {
  return res.status(httpStatus).json({ error: { code, message } });
}

// GET /requests -> 200 with the collection (a JSON array, possibly empty).
// Optional filters travel as query parameters because they change how the collection is
// presented, not which resource it is. Unknown values are a client mistake -> 400.
router.get('/', (req, res) => {
  const { status, priority } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return sendError(res, 400, 'UNKNOWN_FILTER', `Unknown status filter: ${status}`);
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return sendError(res, 400, 'UNKNOWN_FILTER', `Unknown priority filter: ${priority}`);
  }

  res.status(200).json(findAll({ status, priority }));
});

// GET /requests/:id -> 200 with the request, or 404 if it does not exist.
router.get('/:id', (req, res) => {
  const request = findById(Number(req.params.id));

  if (!request) {
    return sendError(res, 404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  res.status(200).json(request);
});

// POST /requests -> 201 with the created request, or 400 on invalid input.
router.post('/', (req, res) => {
  const { title, description, priority } = req.body;

  // Form validation: the request itself is wrong, independent of any state. -> 400
  if (typeof title !== 'string' || title.trim() === '') {
    return sendError(res, 400, 'TITLE_REQUIRED', 'Title is required');
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return sendError(res, 400, 'INVALID_PRIORITY', `Unknown priority: ${priority}`);
  }

  // Server-owned fields: id, status, createdAt, updatedAt. Client values are ignored.
  const now = new Date().toISOString();
  const newRequest = {
    id: generateId(),
    title: title.trim(),
    description,
    status: 'open',
    priority: priority ?? 'medium',
    createdAt: now,
    updatedAt: now
  };

  add(newRequest);

  res.status(201).json(newRequest);
});

// PATCH /requests/:id -> 200 with the updated request.
router.patch('/:id', (req, res) => {
  const request = findById(Number(req.params.id));

  if (!request) {
    return sendError(res, 404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  // A terminal request cannot be modified at all (not even its title). -> 409
  if (isTerminal(request.status)) {
    return sendError(
      res,
      409,
      'REQUEST_IN_TERMINAL_STATUS',
      `Request is ${request.status} and cannot be modified`
    );
  }

  const { title, description, priority, status } = req.body;

  // Only these four fields are modifiable; id/createdAt/updatedAt in the body are ignored.
  const hasModifiableField =
    title !== undefined ||
    description !== undefined ||
    priority !== undefined ||
    status !== undefined;

  if (!hasModifiableField) {
    return sendError(res, 400, 'NOTHING_TO_UPDATE', 'No modifiable fields in the body');
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return sendError(res, 400, 'TITLE_REQUIRED', 'Title is required');
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return sendError(res, 400, 'INVALID_PRIORITY', `Unknown priority: ${priority}`);
  }

  if (status !== undefined) {
    // Unknown value -> the request is malformed in itself. -> 400
    if (!isValidStatus(status)) {
      return sendError(res, 400, 'INVALID_STATUS_TRANSITION', `Unknown status: ${status}`);
    }
    // Known value but not reachable from the current state -> the state makes it impossible.
    // The request is perfectly well-formed; the current state forbids it. -> 409
    if (!canTransition(request.status, status)) {
      return sendError(
        res,
        409,
        'INVALID_STATUS_TRANSITION',
        `Cannot change status from ${request.status} to ${status}`
      );
    }
    request.status = status;
  }

  if (title !== undefined) request.title = title.trim();
  if (description !== undefined) request.description = description;
  if (priority !== undefined) request.priority = priority;

  request.updatedAt = new Date().toISOString();

  res.status(200).json(request);
});

export default router;
