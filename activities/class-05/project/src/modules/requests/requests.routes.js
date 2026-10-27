// Capa HTTP del módulo requests: extrae el body/params, invoca el service y traduce el
// resultado. Sin SQL, sin reglas de dominio. Desde la clase 05, cada handler pasa `req.auth`
// (la identidad verificada por el middleware) como PRIMER argumento al service.
import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory
} from './requests.service.js';
import { respondError } from '../../http/respond-error.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;
    res.status(200).json(await listRequests(req.auth, { status, priority }));
  } catch (error) {
    respondError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.status(200).json(await getRequest(req.auth, Number(req.params.id)));
  } catch (error) {
    respondError(res, error);
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    res.status(200).json(await getHistory(req.auth, Number(req.params.id)));
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await createRequest(req.auth, req.body));
  } catch (error) {
    respondError(res, error);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    res.status(200).json(await patchRequest(req.auth, Number(req.params.id), req.body));
  } catch (error) {
    respondError(res, error);
  }
});

export default router;
