// OPS-703 · Request logger middleware.
//
// ONE structured JSON line per finished request, whatever its outcome. The
// logger module already formats and writes the line — this middleware only
// decides WHEN to log (on 'finish', the first moment the final status is
// known) and WHICH fields to include (an explicit ALLOWLIST).
//
// An allowlist, never the whole request object: logging `req.headers` would
// copy the Authorization token into the logs, and a leaked token is a live
// credential. Nothing here reads a header or a body by accident.
import { logger } from '../logging/logger.js';

export function requestLogger(req, res, next) {
  // Monotonic clock: immune to system time changes, so the duration is exact.
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    // The explicit allowlist. userId only when authenticate ran;
    // errorCode only when the error handler classified the failure.
    const fields = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    };
    if (req.auth?.userId) fields.userId = req.auth.userId;
    if (res.locals.errorCode) fields.errorCode = res.locals.errorCode;

    // A 5xx is a server-side problem -> error level; everything else is info.
    if (res.statusCode >= 500) {
      logger.error('request_failed', fields);
    } else {
      logger.info('request_completed', fields);
    }
  });

  // Logging must never delay the request: move on immediately.
  next();
}
