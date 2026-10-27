// Policy tests: PURE unit tests. No HTTP, no PostgreSQL, no server — this
// is exactly what the claim rule bought when it stopped depending on
// Express: the whole behavior matrix runs in milliseconds with plain
// objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canClaimRequest } from '../src/modules/requests/request.policy.js';

const agent = { userId: 'agent-1', role: 'agent' };
const requester = { userId: 'req-1', role: 'requester' };

function request(overrides = {}) {
  return { id: 1, status: 'open', assignedTo: null, createdBy: 'req-1', ...overrides };
}

test('an agent can claim an open, unassigned request', () => {
  const verdict = canClaimRequest({ actor: agent, request: request() });
  assert.deepEqual(verdict, { allowed: true });
});

test('a requester cannot claim, even an open request', () => {
  const verdict = canClaimRequest({ actor: requester, request: request() });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, 'NOT_AGENT');
});

test('an already assigned request cannot be claimed again', () => {
  const verdict = canClaimRequest({
    actor: agent,
    request: request({ assignedTo: 'other-agent', status: 'in_progress' })
  });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, 'ALREADY_ASSIGNED');
});

test('a request that is not open cannot be claimed', () => {
  for (const status of ['in_progress', 'resolved', 'closed', 'cancelled']) {
    const verdict = canClaimRequest({ actor: agent, request: request({ status }) });
    assert.equal(verdict.allowed, false, `status "${status}" should not be claimable`);
    assert.equal(verdict.reason, 'NOT_OPEN');
  }
});

test('the role rule wins over the state rules', () => {
  // A requester on an assigned request: the FIRST reason reported is the
  // role — the caller maps it to 403 before any state conflict.
  const verdict = canClaimRequest({
    actor: requester,
    request: request({ assignedTo: 'other-agent' })
  });
  assert.equal(verdict.reason, 'NOT_AGENT');
});
