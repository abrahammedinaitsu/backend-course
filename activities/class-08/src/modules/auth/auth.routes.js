// HTTP layer of the auth module: extracts the body, invokes the service
// and answers. No SQL, no cryptography, no token internals — and no
// try/catch: errors flow to the central error middleware.
import express from 'express';
import { register, login, getCurrentUser } from './auth.service.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  res.status(201).json(await register(req.body));
});

router.post('/login', async (req, res) => {
  res.status(200).json(await login(req.body));
});

// /auth/me is protected: it answers "who does the server think I am?".
router.get('/me', authenticate, async (req, res) => {
  res.status(200).json(await getCurrentUser(req.auth));
});

export default router;
