// Traceability tests — INCOMPLETE, on purpose.
//
// They become real as you resolve OPS-703. The hard part is not asserting
// what the logs contain, but what they do NOT contain: capture
// console.log/console.error during a request and inspect the lines.
// (The request logger writes on the response 'finish' event — wait a few
// milliseconds before restoring the console.)
import test from 'node:test';

test('every response carries an X-Request-Id header', { todo: true }, () => {
  // GET /health (or any route) -> the header exists.
});

test('an error body carries the same requestId as the header', { todo: true }, () => {
  // GET /requests/999999999 -> body.requestId === headers['x-request-id'].
});

test('a well-formed client X-Request-Id is kept', { todo: true }, () => {
  // Send X-Request-Id: 'frontend-trace-42' -> the response echoes it.
});

test('a suspicious client X-Request-Id is replaced, never trusted', { todo: true }, () => {
  // Send 300 characters of junk -> the response carries a server-generated id.
});

test('the log line of a request carries the same requestId as the response', { todo: true }, () => {
  // Capture the console during one request; parse each line as JSON; one
  // line must have requestId === the response header.
});

test('the Authorization header and the token never reach the log', { todo: true }, () => {
  // Capture the console during an AUTHENTICATED request and assert no
  // line includes the token or the string 'Bearer '.
});
