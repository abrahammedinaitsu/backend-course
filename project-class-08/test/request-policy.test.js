// Policy tests — INCOMPLETE, on purpose. This is the payoff of the whole
// class: once canClaimRequest depends on nothing, its entire behavior
// matrix runs here with plain objects. No HTTP. No PostgreSQL. No server.
//
// Convert each stub as you implement the policy. Look at the matrix in
// the FEATURE-801 brief: every row becomes one assertion.
import test from 'node:test';

test('an agent can claim an open, unassigned request', { todo: true }, () => {
  // canClaimRequest({ actor: agent, request: openUnassigned })
  //   -> { allowed: true }
});

test('a requester cannot claim, even an open request', { todo: true }, () => {
  // -> { allowed: false, reason: 'NOT_AGENT' }
});

test('an already assigned request cannot be claimed again', { todo: true }, () => {
  // -> { allowed: false, reason: 'ALREADY_ASSIGNED' }
});

test('a request that is not open cannot be claimed', { todo: true }, () => {
  // Cover in_progress, resolved, closed and cancelled in one loop.
  // -> { allowed: false, reason: 'NOT_OPEN' }
});

test('the role rule wins over the state rules', { todo: true }, () => {
  // requester + assigned request -> the reported reason is NOT_AGENT.
  // (The caller answers 403 before any state conflict.)
});
