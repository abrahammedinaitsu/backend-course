// OPS-703 · Not-found middleware.
//
// When NO route matched, answer with the same JSON error contract as
// everything else instead of Express's default HTML page. It forwards a
// typed error so the CENTRAL handler produces the response — no second
// response format to keep in sync.
//
// It is mounted after every route, so it runs only when nothing matched.
import { AppError } from '../app-error.js';

export function notFound(req, res, next) {
  // A generic message: echoing the requested path back could reflect
  // attacker-controlled text into the response (and into the logs).
  next(new AppError('resource', 'ROUTE_NOT_FOUND', 'The requested route does not exist.'));
}
