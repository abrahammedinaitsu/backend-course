// Minimal structured logger: one JSON line per event, written to stdout
// (info) or stderr (error). No files, no external services — the point of
// this class is deciding WHAT to log, not learning a logging library.
//
// Every line carries a timestamp, a level and an event name; the caller
// adds only fields it deliberately chose. Nothing here reads the request,
// so nothing here can leak a header or a body by accident.

function line(level, event, fields = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields
  });
}

export const logger = {
  info(event, fields) {
    console.log(line('info', event, fields));
  },
  error(event, fields) {
    console.error(line('error', event, fields));
  }
};
