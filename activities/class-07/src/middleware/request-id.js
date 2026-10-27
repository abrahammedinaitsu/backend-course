// OPS-703 · Request ID middleware.
//
// Every request gets ONE identifier that travels with it: into the logs,
// into every error body, and back to the client in the X-Request-Id
// response header. It identifies the REQUEST, not the user — so the JWT is
// never used for this.
import { randomUUID } from 'node:crypto';

// A client may SEND an X-Request-Id (so a frontend can correlate its own
// trace). But a header is client input: accept it only when it matches a
// limited, boring, log-safe shape. Anything else (control characters,
// spaces, absurdly long values that could flood the logs) is replaced.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  const id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
    ? incoming
    : `req_${randomUUID()}`;

  // Store it for later middlewares/handlers, and send it back to the client.
  req.requestId = id;
  res.set('X-Request-Id', id);
  next();
}
