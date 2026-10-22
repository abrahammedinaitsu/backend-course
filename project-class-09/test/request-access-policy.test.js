// BUG-901 — pure policy tests for request visibility.
//
// These run WITHOUT a server and WITHOUT a database: build the actor and
// the request as plain objects, call the policy, assert the verdict.
// If one of these needs .env to pass, the policy stopped being pure.
//
// Spoiler you will discover anyway: the policy may be healthier than you
// expect. Green tests here do NOT mean the endpoint is protected — they
// mean the RULE is correct wherever it is actually consulted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canViewRequest } from '../src/modules/requests/request.policy.js';

const agent = { userId: 'uuid-agent', role: 'agent' };
const owner = { userId: 'uuid-owner', role: 'requester' };
const stranger = { userId: 'uuid-stranger', role: 'requester' };
const requestOwnedByOwner = { id: 42, status: 'open', createdBy: 'uuid-owner' };

test('an agent can view any request', () => {
  // The role broadens permission: an agent reads any request.
  assert.equal(canViewRequest(agent, requestOwnedByOwner), true);
});

test('the owner requester can view their own request', () => {
  // Ownership: the requester reads what they created.
  assert.equal(canViewRequest(owner, requestOwnedByOwner), true);
});

test('a different requester cannot view the request', () => {
  // BUG-901 core: same role, foreign resource -> denied by ownership.
  assert.equal(canViewRequest(stranger, requestOwnedByOwner), false);
});
