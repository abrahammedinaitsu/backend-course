// OPS-703 · Central error middleware (guided skeleton).
//
// Goal: ONE place where an error becomes an HTTP response, replacing the
// try/catch repeated inside every route. Express 5 forwards thrown errors
// and rejected promises here on its own — once this middleware is
// registered in the right position in app.js.
//
// Express recognizes an error middleware because it declares EXACTLY four
// parameters. Do not remove any of them, even if unused.
// Reference: https://expressjs.com/en/guide/error-handling/
//
// TODO(OPS-703): implement the handler. Checklist:
//   [ ] If res.headersSent is true, delegate: return next(error).
//   [ ] If the error is an AppError, translate its category to a status
//       (the table lives today inside src/http/respond-error.js — this
//       middleware replaces that file) and answer
//       { error: { code, message }, requestId }.
//   [ ] If the error comes from a body that is not valid JSON
//       (error.type === 'entity.parse.failed'), answer 400 INVALID_JSON.
//   [ ] If the error code marks the database as unreachable
//       (see INFRASTRUCTURE_CODES in respond-error.js), answer 503
//       DATABASE_UNAVAILABLE — and log it, without the connection string.
//   [ ] Anything else is UNEXPECTED: answer a generic 500 INTERNAL_ERROR
//       and log the real name, message and stack through the logger.
//       The response NEVER carries error.message, error.stack, SQL,
//       table names or paths.
//   [ ] Set res.locals.errorCode in every branch, so the request logger
//       can include it in its line.
//
// Questions before coding:
//   - Why must this middleware be registered AFTER the routes?
//   - Which part of the error may the CLIENT see, and which part only
//     the developer reading the log?
import { AppError } from '../app-error.js';
import { logger } from '../logging/logger.js';

export function errorHandler(error, req, res, next) {
  // TODO(OPS-703): replace this delegation with the real implementation.
  // (While it stands, Express's DEFAULT handler answers — look at what it
  // exposes in the response and ask yourself if support would accept it.)
  next(error);
}
