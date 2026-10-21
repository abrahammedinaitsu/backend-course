// Health and readiness tests — INCOMPLETE, on purpose.
//
// The interesting case is "/ready when the database is down" WITHOUT
// touching your real credentials: createHealthRouter accepts an injectable
// checkDatabase function — hand it one that throws, mounted on a tiny
// throwaway express() app.
import test from 'node:test';

test('GET /health answers 200 ok without touching PostgreSQL', { todo: true }, () => {
  // Bonus proof: sabotage pool.query for the duration of the test and
  // /health must still answer 200.
});

test('GET /ready answers 200 when PostgreSQL responds', { todo: true }, () => {
  // { status: 'ready', database: 'available' }
});

test('GET /ready answers 503 when the database check fails', { todo: true }, () => {
  // createHealthRouter({ checkDatabase: failing }) -> 503
  // { status: 'not_ready', database: 'unavailable' }
});

test('the readiness response never reveals connection details', { todo: true }, () => {
  // Make the injected check throw an error mentioning a host and a port:
  // neither may appear in the response body.
});
