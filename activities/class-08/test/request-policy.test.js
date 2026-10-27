// Policy tests for FEATURE-801. This is the payoff of the whole class:
// once canClaimRequest depends on nothing, its entire behavior matrix runs
// here with plain objects. No HTTP. No PostgreSQL. No server. Milliseconds.
//
// Every row of the ticket's matrix becomes one assertion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canClaimRequest } from '../src/modules/requests/request.policy.js';

// Actors as plain objects — no JWT, no database.
const agent = { userId: 'agent-uuid', role: 'agent' };
const requester = { userId: 'requester-uuid', role: 'requester' };

// Requests as already-mapped representations (camelCase), the shape the
// service hands to the policy.
function request(overrides = {}) {
  return {
    id: 42,
    title: 'Projector failure',
    description: null,
    priority: 'medium',
    status: 'open',
    createdBy: 'requester-uuid',
    assignedTo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

test('an agent can claim an open, unassigned request', () => {
  const decision = canClaimRequest({ actor: agent, request: request() });
  assert.deepEqual(decision, { allowed: true });
});

test('a requester cannot claim, even an open request', () => {
  const decision = canClaimRequest({ actor: requester, request: request() });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'NOT_AGENT');
});

test('an already assigned request cannot be claimed again', () => {
  const decision = canClaimRequest({
    actor: agent,
    request: request({ assignedTo: 'other-agent-uuid' })
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'ALREADY_ASSIGNED');
});

test('a request that is not open cannot be claimed', () => {
  // in_progress, resolved, closed and cancelled: every non-open state.
  for (const status of ['in_progress', 'resolved', 'closed', 'cancelled']) {
    const decision = canClaimRequest({ actor: agent, request: request({ status }) });
    assert.equal(decision.allowed, false, `expected denial for "${status}"`);
    assert.equal(decision.reason, 'NOT_OPEN', `expected NOT_OPEN for "${status}"`);
  }
});

test('the role rule wins over the state rules', () => {
  // requester + assigned request -> the reported reason is NOT_AGENT.
  // The caller answers 403 before any state conflict.
  const decision = canClaimRequest({
    actor: requester,
    request: request({ status: 'closed', assignedTo: 'someone' })
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'NOT_AGENT');
});

test('an assigned check beats the not-open check for an agent', () => {
  // Open-ness and assignment are both violated: the more specific
  // conflict (already assigned) is the one reported.
  const decision = canClaimRequest({
    actor: agent,
    request: request({ status: 'in_progress', assignedTo: 'someone' })
  });
  assert.equal(decision.reason, 'ALREADY_ASSIGNED');
});

test('a request with assignedTo null is claimable when open', () => {
  // The distinction that migration 005 makes explicit: NULL means nobody.
  const decision = canClaimRequest({
    actor: agent,
    request: request({ assignedTo: null, status: 'open' })
  });
  assert.deepEqual(decision, { allowed: true });
});
