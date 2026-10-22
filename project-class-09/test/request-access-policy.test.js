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

test('an agent can view any request', { todo: true }, () => {
  // Convert me: canViewRequest(agent, requestOwnedByOwner) should be true.
  void agent; void requestOwnedByOwner; void assert;
});

test('the owner requester can view their own request', { todo: true }, () => {
  // Convert me: canViewRequest(owner, requestOwnedByOwner) should be true.
  void owner;
});

test('a different requester cannot view the request', { todo: true }, () => {
  // Convert me: canViewRequest(stranger, requestOwnedByOwner) should be false.
  void stranger;
});
