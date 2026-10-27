// Not-found middleware: runs only when NO route matched the request.
// Instead of Express's default HTML page, it forwards a typed error so the
// central error handler answers with the same JSON contract as everything
// else. The message is deliberately generic: echoing the requested path
// back would reflect arbitrary client input into the response.
import { AppError } from '../app-error.js';

export function notFound(req, res, next) {
  next(new AppError('resource', 'ROUTE_NOT_FOUND', 'The requested path does not exist.'));
}
