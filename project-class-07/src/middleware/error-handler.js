// OPS-703 · Central error middleware.
//
// ONE place where an error becomes an HTTP response. It replaces the
// try/catch that used to be repeated inside every route. Express 5 forwards
// thrown errors and rejected promises here on its own, so the routes no
// longer need to catch anything.
//
// Express recognizes an error middleware because it declares EXACTLY four
// parameters. Do not remove any of them, even when unused.
// Reference: https://expressjs.com/en/guide/error-handling/
import { AppError } from '../app-error.js';
import { logger } from '../logging/logger.js';

// Category -> status. This is the single translation table; it replaces the
// one that lived inside src/http/respond-error.js.
const CATEGORY_STATUS = {
  contract: 400,
  auth: 401,
  forbidden: 403,
  resource: 404,
  domain: 409
};

// Errors whose cause is the database being unreachable -> 503.
const INFRASTRUCTURE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', '57P03'];

function errorBody(code, message, req) {
  // Every error body carries the requestId, so support can find the log.
  return { error: { code, message }, requestId: req.requestId };
}

export function errorHandler(error, req, res, next) {
  // If the response already started, we cannot rewrite it: delegate to
  // Express's default handler, which will close the connection properly.
  if (res.headersSent) return next(error);

  // 1 · Expected, typed application errors: translate the category.
  if (error instanceof AppError) {
    res.locals.errorCode = error.code;
    const status = CATEGORY_STATUS[error.category] ?? 500;
    return res.status(status).json(errorBody(error.code, error.message, req));
  }

  // 2 · A body that is not valid JSON (body-parser). It is the consumer's
  // fault, so it is a 400 — not an internal error.
  if (error.type === 'entity.parse.failed') {
    res.locals.errorCode = 'INVALID_JSON';
    return res.status(400).json(errorBody('INVALID_JSON', 'The request body is not valid JSON.', req));
  }

  // 3 · Infrastructure: the data store is unreachable -> 503. Log enough to
  // diagnose, but never the connection string or the SQL.
  if (INFRASTRUCTURE_CODES.includes(error.code) || /Connection terminated/i.test(error.message ?? '')) {
    res.locals.errorCode = 'DATABASE_UNAVAILABLE';
    logger.error('database_unavailable', {
      requestId: req.requestId,
      code: error.code ?? 'unknown'
    });
    return res.status(503).json(errorBody(
      'DATABASE_UNAVAILABLE',
      'The service cannot access its data store.',
      req
    ));
  }

  // 4 · Anything else is UNEXPECTED: a generic 500 outside, the real detail
  // (name, message, stack) only in the log. The response NEVER carries
  // error.message, error.stack, SQL, table names or paths.
  res.locals.errorCode = 'INTERNAL_ERROR';
  logger.error('unexpected_error', {
    requestId: req.requestId,
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  return res.status(500).json(errorBody(
    'INTERNAL_ERROR',
    'An unexpected error occurred.',
    req
  ));
}
