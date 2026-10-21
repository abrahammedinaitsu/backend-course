// Application setup: middlewares, route mounting and the central error handler. It does not
// open any port, so the app can be mounted in a test without listening.
import express from 'express';
import requestsRoutes from './modules/requests/requests.routes.js';
import { HttpError } from './modules/requests/requests.service.js';

const app = express();

// Parses incoming JSON bodies into req.body.
app.use(express.json());

// Every route inside the module is served under /requests.
app.use('/requests', requestsRoutes);

// No route matched -> resource category.
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

// PostgreSQL error codes we translate. Anything unlisted is "internal".
const PG_CONSTRAINT_VIOLATIONS = new Set(['23514', '23503', '23505', '23502']);
const PG_UNAVAILABLE = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03']);

// The central error handler. It classifies every failure into a category and responds with
// the SAME shape as always: { error: { code, message } }. It never leaks secrets, hosts, SQL
// or stack traces to the client.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  // Errors the service already classified (contract, resource, domain).
  if (error instanceof HttpError) {
    // Log internally without secrets; respond with the code message.
    console.error(`[${error.code}] ${req.method} ${req.originalUrl}: ${error.message}`);
    return res
      .status(error.httpStatus)
      .json({ error: { code: error.code, message: error.message } });
  }

  // Persistence: the database rejected something the app believed was valid — our bug.
  if (PG_CONSTRAINT_VIOLATIONS.has(error.code)) {
    console.error(`[PERSISTENCE_CONSTRAINT] ${req.method} ${req.originalUrl}: ${error.message}`);
    return res.status(500).json({
      error: {
        code: 'PERSISTENCE_CONSTRAINT',
        message: 'The data store rejected an operation due to an integrity constraint.'
      }
    });
  }

  // Infrastructure: the database is not reachable. Not the client's fault, not our bug.
  if (PG_UNAVAILABLE.has(error.code) || error.code === 'ECONNRESET') {
    console.error(`[DATABASE_UNAVAILABLE] ${req.method} ${req.originalUrl}: ${error.message}`);
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The service cannot access its data store.'
      }
    });
  }

  // Internal: unexpected error. The stack goes to the log, never to the client.
  console.error(`[INTERNAL_ERROR] ${req.method} ${req.originalUrl}:`, error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }
  });
});

export default app;
