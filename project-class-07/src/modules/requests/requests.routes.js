// HTTP layer of the requests module: it extracts path, query, body and the
// authenticated actor and invokes the operation. It contains no SQL and no
// domain rules. The router assumes app.js mounted it behind `authenticate`,
// so req.auth is always present here.
//
// OPS-703: the per-route try/catch is gone. Express 5 forwards thrown errors
// and rejected promises to the central error middleware on its own, so the
// routes just let errors propagate — ONE place (error-handler.js) turns them
// into responses of the contract.

import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory
} from './requests.service.js';
import { parseRequestId } from './request-id.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { status, priority } = req.query;
  res.status(200).json(await listRequests(req.auth, { status, priority }));
});

router.get('/:id', async (req, res) => {
  // INC-701 fix: validate the id BEFORE it reaches SQL. An invalid format
  // is a consumer problem (400), not an internal failure (500).
  res.status(200).json(await getRequest(req.auth, parseRequestId(req.params.id)));
});

router.get('/:id/history', async (req, res) => {
  res.status(200).json(await getHistory(req.auth, parseRequestId(req.params.id)));
});

router.post('/', async (req, res) => {
  res.status(201).json(await createRequest(req.auth, req.body));
});

router.patch('/:id', async (req, res) => {
  res.status(200).json(await patchRequest(req.auth, parseRequestId(req.params.id), req.body));
});

export default router;
