// Error contract tests — INCOMPLETE, on purpose.
//
// These are the regression tests you will write during the workshop. Each
// stub states the QUESTION the test must answer; you turn it into a real
// Prepare -> Act -> Check test as you resolve INC-701 and INC-702.
//
// Remove { todo: true } as you implement each one. Use the existing
// helpers (test/helpers/) — unique data per run, cleanup of exactly what
// was created — and look at test/requests.test.js for the house style.
import test from 'node:test';

// ------------------------------------------------- INC-701 regression

test('an alphabetic id answers 400 INVALID_REQUEST_ID, not 500', { todo: true }, () => {
  // Prepare: a registered user with a token.
  // Act:     GET /requests/not-a-number
  // Check:   status 400 AND body.error.code === 'INVALID_REQUEST_ID'
});

test('decimal, zero and negative ids are rejected the same way', { todo: true }, () => {
  // Same question for '1.5', '0', '-3' and '12abc'.
  // What does parseInt('12abc') return? Is that what the client sent?
});

test('a well-formed id that matches nothing still answers 404', { todo: true }, () => {
  // GET /requests/999999999 -> 404 REQUEST_NOT_FOUND.
  // The fix for INC-701 must NOT change this: invalid format and missing
  // resource are different answers.
});

// ------------------------------------------------- INC-702 regression

test('an invalid priority answers 400 INVALID_PRIORITY before touching SQL', { todo: true }, () => {
  // Prepare: an owner with a request, an agent with a token.
  // Act:     PATCH /requests/:id { priority: 'critical' } as the agent.
  // Check:   status 400 AND body.error.code === 'INVALID_PRIORITY'.
});

test('a valid priority change still works after the fix', { todo: true }, () => {
  // PATCH { priority: 'high' } as agent -> 200 with priority 'high'.
  // A fix that breaks the valid case is not a fix.
});

// ------------------------------------------------- central error handler

test('an unexpected error answers a generic 500 without internal details', { todo: true }, () => {
  // How do you PROVOKE an unexpected error in a test without breaking the
  // real database? Look at how the validator does it (it replaces
  // pool.query for a moment), and check that the response body contains
  // neither the internal message nor a stack frame.
});

test('every error body shares the same shape: error.code, error.message, requestId', { todo: true }, () => {
  // Pick any expected error and assert the three fields exist and are strings.
});
