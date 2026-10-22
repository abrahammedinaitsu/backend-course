// Request ID middleware: every request gets one identifier that travels
// with it — into logs, into error responses and back to the client in the
// X-Request-Id header. It identifies the REQUEST, not the user: it is not
// a secret and it must never be the JWT.
//
// A client may propose its own id (useful when a frontend wants to
// correlate its logs with ours), but only a limited, boring format is
// accepted. Anything else — too long, strange characters, line breaks —
// is replaced, never trusted: headers are client input like any other.
import { randomUUID } from 'node:crypto';

const ACCEPTED_EXTERNAL_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestId(req, res, next) {
  const provided = req.headers['x-request-id'];

  req.requestId = (typeof provided === 'string' && ACCEPTED_EXTERNAL_ID.test(provided))
    ? provided
    : `req_${randomUUID()}`;

  res.set('X-Request-Id', req.requestId);
  next();
}
