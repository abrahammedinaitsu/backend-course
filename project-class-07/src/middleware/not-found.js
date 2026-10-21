// OPS-703 · Not-found middleware (guided skeleton).
//
// Goal: when NO route matched, answer with the same JSON error contract as
// everything else instead of Express's default HTML page.
//
// TODO(OPS-703): forward a typed error so the central error handler
// produces the response:
//   next(new AppError('resource', 'ROUTE_NOT_FOUND', '...generic message...'));
//
// Questions before coding:
//   - Where must this middleware live so it runs ONLY when nothing matched?
//   - Why is echoing the requested path back into the message a bad idea?
import { AppError } from '../app-error.js';

export function notFound(req, res, next) {
  // TODO(OPS-703): replace this pass-through with the real implementation.
  next();
}
