// HTTP layer of the auth module: extracts the body, invokes the service
// and translates results. No SQL, no cryptography, no token internals.
import express from 'express';
import { register, login, getCurrentUser } from './auth.service.js';
import { respondError } from '../../http/respond-error.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    res.status(201).json(await register(req.body));
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/login', async (req, res) => {
  try {
    res.status(200).json(await login(req.body));
  } catch (error) {
    respondError(res, error);
  }
});

// /auth/me is protected: it answers "who does the server think I am?".
router.get('/me', authenticate, async (req, res) => {
  try {
    res.status(200).json(await getCurrentUser(req.auth));
  } catch (error) {
    respondError(res, error);
  }
});

export default router;
