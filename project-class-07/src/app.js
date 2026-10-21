// Application setup: middlewares and module mounting. It does not open any
// port.
//
// Order matters, and here is why:
//   1. corsPolicy    answers preflights before anything else runs.
//   2. requestId     every request gets its id BEFORE any log or error.
//   3. requestLogger starts the timer; it logs on the response 'finish'.
//   4. express.json  parses the body; a parse failure becomes a caught error.
//   5. routes        the real work (/auth, /requests, /health).
//   6. notFound      runs only when NO route matched.
//   7. errorHandler  LAST and with four parameters: an error middleware only
//                    sees what happened BEFORE it in this file.
import express from 'express';
import { corsPolicy } from './middleware/cors.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/authenticate.js';
import { healthRoutes } from './routes/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';

const app = express();

// CORS first: preflights must be answered before anything else runs.
app.use(corsPolicy);

// Request id first among ours: logs and error bodies both carry it.
app.use(requestId);

// Structured logging: one JSON line per finished request.
app.use(requestLogger);

// Parses incoming JSON bodies into req.body.
app.use(express.json());

// Operational endpoints: public, no authentication, no database for /health.
app.use(healthRoutes);

// /auth mixes public routes (register, login) and one protected route
// (/me), so the module applies `authenticate` internally where needed.
app.use('/auth', authRoutes);

// Every requests route needs a trusted actor: authenticate runs first and
// builds req.auth, or answers 401 and the router never runs.
app.use('/requests', authenticate, requestsRoutes);

// No route matched -> a typed error, answered by the central handler.
app.use(notFound);

// The single translation point from errors to responses. Four parameters.
app.use(errorHandler);

export default app;
