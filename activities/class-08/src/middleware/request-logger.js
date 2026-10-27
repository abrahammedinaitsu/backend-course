// Request logger: one structured line per finished request, whatever its
// outcome. It logs an explicit ALLOWLIST of fields — method, path, status,
// duration, requestId, and userId when authentication ran. It never logs
// headers, bodies, tokens or query strings: what is not on the list does
// not reach the log.
//
// Responsibility split with the error handler:
//   - this middleware records that the request FINISHED (every request);
//   - the error handler records the internal DETAIL of unexpected errors.
// They meet through the same requestId, so one line finds the other.
import { logger } from '../logging/logger.js';

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  // 'finish' fires when the response has been handed to the socket — the
  // only moment the final status code is known.
  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

    const fields = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs
    };
    if (req.auth?.userId) fields.userId = req.auth.userId;
    if (res.locals.errorCode) fields.errorCode = res.locals.errorCode;

    if (res.statusCode >= 500) {
      logger.error('request_failed', fields);
    } else {
      logger.info('request_completed', fields);
    }
  });

  next();
}
