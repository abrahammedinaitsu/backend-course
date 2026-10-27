// EXERCISE FIXTURE — a controlled, isolated failure for reading practice.
// It does NOT touch your application or your database: the "response" below
// is simulated on purpose so the failure is always the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';

function simulatedRequestWithoutAuthHeader() {
  // Someone forgot the Authorization header. The (simulated) API answers:
  return { status: 404, body: { error: { code: 'REQUEST_NOT_FOUND' } } };
}

test('GET /requests/42 returns the request for its owner', () => {
  // Prepare
  const response = simulatedRequestWithoutAuthHeader();

  // Check
  assert.equal(response.status, 200);
});
