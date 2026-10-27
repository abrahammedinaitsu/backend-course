// Single translation point from typed errors to HTTP responses, shared by
// every router and middleware. It knows status codes; it knows no SQL and
// no domain rules.
import { AppError } from '../app-error.js';

const CATEGORY_STATUS = {
  contract: 400,
  auth: 401,
  forbidden: 403,
  resource: 404,
  domain: 409
};

// Errors whose cause is the database being unreachable -> 503.
const INFRASTRUCTURE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', '57P03'];

export function errorBody(code, message) {
  return { error: { code, message } };
}

export function respondError(res, error) {
  if (error instanceof AppError) {
    return res.status(CATEGORY_STATUS[error.category] ?? 500)
      .json(errorBody(error.code, error.message));
  }

  if (INFRASTRUCTURE_CODES.includes(error.code) || /Connection terminated/i.test(error.message ?? '')) {
    // Log enough to diagnose — never the connection string.
    console.error('[infrastructure] database unavailable:', error.code ?? error.message);
    return res.status(503).json(errorBody(
      'DATABASE_UNAVAILABLE',
      'The service cannot access its data store.'
    ));
  }

  // Unknown errors are internal: generic response outside, details inside.
  // The response never carries a stack trace or a secret.
  console.error('[internal]', error);
  return res.status(500).json(errorBody(
    'INTERNAL_ERROR',
    'An unexpected error occurred.'
  ));
}
