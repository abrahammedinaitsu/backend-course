// Central error middleware: the ONE place where an error becomes an HTTP
// response. Since class 7 it replaces the per-route try/catch pattern —
// Express 5 forwards thrown errors and rejected promises here on its own.
//
// It is registered AFTER every route in app.js (an error middleware only
// sees what happened before it), and Express recognizes it as an error
// handler because it declares exactly four parameters.
//
// The contract of the response never changes with the cause:
//   { "error": { "code", "message" }, "requestId": "..." }
// The public message explains the CATEGORY of the problem; the internal
// detail (real message, stack) goes to the log, tied by the requestId.
import { AppError } from '../app-error.js';
import { logger } from '../logging/logger.js';

// Same table the project has used since class 5: a domain category, not
// the thrower, decides the status code.
const CATEGORY_STATUS = {
  contract: 400,
  auth: 401,
  forbidden: 403,
  resource: 404,
  domain: 409
};

// Errors whose cause is the database being unreachable -> 503.
const INFRASTRUCTURE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', '57P03'];

function errorBody(code, message, requestId) {
  return { error: { code, message }, requestId };
}

export function errorHandler(error, req, res, next) {
  // If the response already started streaming we cannot rewrite it as
  // JSON: delegate to Express, which closes the connection.
  if (res.headersSent) {
    return next(error);
  }

  const id = req.requestId;

  // Expected errors: part of the contract. The thrower chose category,
  // code and a public message — nothing internal travels in them.
  if (error instanceof AppError) {
    res.locals.errorCode = error.code;
    return res.status(CATEGORY_STATUS[error.category] ?? 500)
      .json(errorBody(error.code, error.message, id));
  }

  // A body that is not valid JSON is a client problem, not a server bug.
  if (error.type === 'entity.parse.failed') {
    res.locals.errorCode = 'INVALID_JSON';
    return res.status(400)
      .json(errorBody('INVALID_JSON', 'The request body is not valid JSON.', id));
  }

  if (INFRASTRUCTURE_CODES.includes(error.code) || /Connection terminated/i.test(error.message ?? '')) {
    res.locals.errorCode = 'DATABASE_UNAVAILABLE';
    // Enough to diagnose — never the connection string.
    logger.error('database_unavailable', { requestId: id, code: error.code ?? error.message });
    return res.status(503)
      .json(errorBody('DATABASE_UNAVAILABLE', 'The service cannot access its data store.', id));
  }

  // Unexpected errors: a defect or an infrastructure failure we did not
  // classify. Generic response outside; name, message and stack INSIDE the
  // log only, findable through the same requestId the client received.
  res.locals.errorCode = 'INTERNAL_ERROR';
  logger.error('unexpected_error', {
    requestId: id,
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  return res.status(500)
    .json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred.', id));
}
