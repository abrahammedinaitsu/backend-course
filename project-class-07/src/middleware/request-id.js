// OPS-703 · Request ID middleware (guided skeleton).
//
// Goal: every request gets ONE identifier that travels with it — into the
// logs, into every error body, and back to the client in the X-Request-Id
// response header. It identifies the REQUEST, not the user.
//
// TODO(OPS-703): implement the middleware. Checklist:
//   [ ] Read the optional X-Request-Id header sent by the client.
//   [ ] Accept it ONLY if it matches a limited, boring format
//       (alphanumeric plus . _ -, at most 64 characters). A header is
//       client input: never trust it as-is.
//   [ ] Otherwise generate one with crypto.randomUUID()
//       (https://nodejs.org/api/crypto.html#cryptorandomuuidoptions).
//       Suggested shape: `req_${randomUUID()}`.
//   [ ] Store it in req.requestId so later middlewares and handlers can use it.
//   [ ] Send it back with res.set('X-Request-Id', ...).
//   [ ] Call next().
//
// Questions before coding:
//   - Is a request id a secret? Would the JWT work as one? Why not?
//   - What could a client do with an UNLIMITED header echoed into logs?
import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  // TODO(OPS-703): replace this pass-through with the real implementation.
  next();
}
