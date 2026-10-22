// HTTP layer of the requests module: it extracts path, query, body and
// the authenticated actor, invokes the operation and answers. It contains
// no SQL and no domain rules — with ONE exception that the team inherited
// and nobody has dared to touch: the history handler grew until it did
// everything by itself. It works. Every test passes. And still, something
// is wrong with it — that is this week's conversation.

import express from 'express';
import { pool } from '../../database/pool.js';
import { AppError } from '../../app-error.js';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest
} from './requests.service.js';
import { parseIdParam } from '../../http/parse-id.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { status, priority } = req.query;
  res.status(200).json(await listRequests(req.auth, { status, priority }));
});

router.get('/:id', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await getRequest(req.auth, id));
});

// ─────────────────────────────────────────────────────────────────────
// GET /:id/history — the handler that does EVERYTHING.
// HTTP, visibility rules, SQL, mapping and response, all in one place.
// Behavior is EXACTLY the class 06/07 contract (the tests prove it).
// Ask yourself: how many different reasons does this function have to
// change?
// ─────────────────────────────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  // Reading and validating the path parameter (HTTP).
  const raw = req.params.id;
  if (typeof raw !== 'string' || !/^[1-9][0-9]{0,17}$/.test(raw)) {
    throw new AppError('contract', 'INVALID_REQUEST_ID',
      'Request id must be a positive integer.');
  }
  const id = Number(raw);

  // Fetching the request (SQL, in the middle of a route).
  const requestResult = await pool.query(
    `SELECT id, title, description, priority, status, created_by, created_at, updated_at
     FROM requests WHERE id = $1`,
    [id]
  );
  const requestRow = requestResult.rows[0];
  if (!requestRow) {
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }

  // Deciding visibility (a business rule, re-written here by hand).
  const isAgent = req.auth.role === 'agent';
  const isOwner = requestRow.created_by === req.auth.userId;
  if (!isAgent && !isOwner) {
    // A foreign request answers exactly like a missing one (class 05).
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }

  // Fetching the history (more SQL).
  const historyResult = await pool.query(
    `SELECT id, type, from_status, to_status, from_priority, to_priority, created_at
     FROM request_history
     WHERE request_id = $1
     ORDER BY created_at, id`,
    [id]
  );

  // Building the representation (mapping, duplicated from the mapper).
  const events = historyResult.rows.map((row) => {
    if (row.type === 'priority_changed') {
      return {
        id: Number(row.id),
        type: row.type,
        fromPriority: row.from_priority,
        toPriority: row.to_priority,
        createdAt: row.created_at
      };
    }
    return {
      id: Number(row.id),
      type: row.type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      createdAt: row.created_at
    };
  });

  // Answering (HTTP again).
  res.status(200).json(events);
});

// TODO(FEATURE-801): POST /:id/claim — the new business action. Before
// wiring it here, decide WHERE each responsibility will live. The route's
// job is small: validate the id, read the authenticated actor, call the
// service, answer 200 with the result.

router.post('/', async (req, res) => {
  res.status(201).json(await createRequest(req.auth, req.body));
});

router.patch('/:id', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await patchRequest(req.auth, id, req.body));
});

export default router;
