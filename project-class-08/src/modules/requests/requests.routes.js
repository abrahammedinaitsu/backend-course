// HTTP layer of the requests module: it extracts path, query, body and
// the authenticated actor, invokes the operation and answers. It contains
// no SQL and no domain rules. The history handler used to be the exception
// (class 08 refactored it): every responsibility now lives in the layer
// that owns it, and this file only translates HTTP.

import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory
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

// GET /:id/history — refactored (class 08). The handler used to do
// EVERYTHING: it validated the id, ran two queries, re-wrote the
// visibility rule, mapped events by hand and answered. Now it does ONE
// thing: translate HTTP. The id goes through parseIdParam (shared), the
// use case lives in getHistory (service), the SQL lives in the store, the
// policy decides visibility and the mapper builds the representation.
// Observable behavior is unchanged — the history tests prove it.
router.get('/:id/history', async (req, res) => {
  const id = parseIdParam(req.params.id);
  res.status(200).json(await getHistory(req.auth, id));
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
