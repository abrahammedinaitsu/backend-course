// HTTP in, HTTP out. Routes extract path/query/body, call the service, and translate results
// and typed errors into status codes. They contain NO SQL and decide NO transitions.
import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  getRequestHistory,
  HttpError
} from './requests.service.js';
import { isValidStatus } from './request-status.js';

const router = express.Router();

// This router is mounted at /requests in app.js, so '/' here means GET /requests.
const PRIORITIES = ['low', 'medium', 'high'];

// Every error in this API has the same shape: { error: { code, message } }.
function sendError(res, httpStatus, code, message) {
  return res.status(httpStatus).json({ error: { code, message } });
}

// asyncHandler lets an async route reject and reach the central error handler instead of
// hanging the request (Express 5 forwards rejected promises, but keeping this explicit is
// self-documenting and version-proof).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /requests -> 200 with the collection. Filters are query params (contract of class 3).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, priority } = req.query;

    // Unknown filter values are a client mistake -> 400 (validated before touching SQL).
    if (status !== undefined && !isValidStatus(status)) {
      return sendError(res, 400, 'UNKNOWN_FILTER', `Unknown status filter: ${status}`);
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return sendError(res, 400, 'UNKNOWN_FILTER', `Unknown priority filter: ${priority}`);
    }

    const requests = await listRequests({ status, priority });
    res.status(200).json(requests);
  })
);

// GET /requests/:id/history -> 200 with the events, or 404 if the request does not exist.
// Declared BEFORE '/:id' so the literal path is not swallowed by the parameter route.
router.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const events = await getRequestHistory(Number(req.params.id));
    res.status(200).json(events);
  })
);

// GET /requests/:id -> 200 with the request, or 404.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const request = await getRequest(Number(req.params.id));
    res.status(200).json(request);
  })
);

// POST /requests -> 201 with the created request, or 400 on invalid input.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const created = await createRequest(req.body);
    res.status(201).json(created);
  })
);

// PATCH /requests/:id -> 200 with the updated request.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const updated = await updateRequest(Number(req.params.id), req.body);
    res.status(200).json(updated);
  })
);

export default router;
