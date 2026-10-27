// HTTP layer of the requests module: it extracts path, query, body and
// the authenticated actor, invokes the operation and answers. It contains
// no SQL and no domain rules — and, since class 7, no try/catch either:
// Express 5 forwards a rejected handler promise to the central error
// middleware, which owns the translation from errors to responses.
//
// The :id parameter is validated HERE, at the HTTP boundary, before any
// query runs: an invalid id is a contract violation, not a database error.

import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory,
  claimRequest
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

router.get('/:id/history', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await getHistory(req.auth, id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await createRequest(req.auth, req.body));
});

// FEATURE-801: an action with a name. No body needed — the agent's
// identity travels in the token, never in the payload.
router.post('/:id/claim', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await claimRequest(req.auth, id, req.body));
});

router.patch('/:id', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await patchRequest(req.auth, id, req.body));
});

export default router;
