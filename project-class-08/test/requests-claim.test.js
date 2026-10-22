// API tests for FEATURE-801 — INCOMPLETE, on purpose. The behavior matrix
// of the claim, through HTTP. Convert each stub as the feature grows; use
// the existing helpers (unique data per run, cleanup of what you create).
import test from 'node:test';

test('claim requires authentication', { todo: true }, () => {
  // POST /requests/:id/claim without token -> 401
});

test('a requester cannot claim a request', { todo: true }, () => {
  // as requester -> 403
});

test('an agent claims an open request: 200, assignedTo from the token, in_progress', { todo: true }, () => {
  // status 200, body.assignedTo === agent.id, body.status === 'in_progress',
  // updatedAt advanced.
});

test('claiming a nonexistent request answers 404', { todo: true }, () => {
  // /requests/999999999/claim -> 404 REQUEST_NOT_FOUND
});

test('a second claim answers 409 REQUEST_ALREADY_ASSIGNED', { todo: true }, () => {
  // and the error body still carries requestId (class 07 contract).
});

test('a terminal request cannot be claimed', { todo: true }, () => {
  // cancel it first (PATCH), then claim -> 409
});

test('assignedTo in the body is rejected as a server-controlled field', { todo: true }, () => {
  // body { assignedTo: otherId } -> 400 SERVER_CONTROLLED_FIELD
});

test('the claim leaves a request_claimed event in the history', { todo: true }, () => {
  // GET /requests/:id/history contains { type: 'request_claimed',
  // fromStatus: 'open', toStatus: 'in_progress' }.
});
