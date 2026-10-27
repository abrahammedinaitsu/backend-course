// API tests for FEATURE-801 — the behavior matrix of the claim, through
// HTTP. Prepare -> Act -> Check, unique data per run, cleanup of exactly
// what was created (same house style as the other suites).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, createRequestAs } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

test('claim requires authentication', async () => {
  const owner = await createUser({ name: 'claimnoauth' });
  const ownerToken = await loginAs(owner);
  const created = await createRequestAs(ownerToken);

  // No token at all.
  const response = await request(app).post(`/requests/${created.id}/claim`);

  assert.equal(response.status, 401);
});

test('a requester cannot claim a request', async () => {
  // Prepare: a requester owns an open request and tries to claim it.
  const owner = await createUser({ name: 'claimrequester' });
  const ownerToken = await loginAs(owner);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${ownerToken}`);

  // 403: the ROLE rule, decided by the policy (NOT_AGENT).
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('an agent claims an open request: 200, assignedTo from the token, in_progress', async () => {
  const owner = await createUser({ name: 'claimowner' });
  const agent = await createUser({ name: 'claimagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  // Identity comes from the token, not the body.
  assert.equal(response.body.assignedTo, agent.id);
  assert.equal(response.body.status, 'in_progress');
  // updatedAt advanced with the claim.
  assert.ok(new Date(response.body.updatedAt) > new Date(created.updatedAt));
});

test('claiming a nonexistent request answers 404', async () => {
  const agent = await createUser({ name: 'claimmissing', role: 'agent' });
  const agentToken = await loginAs(agent);

  const response = await request(app)
    .post('/requests/999999999/claim')
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

test('a second claim answers 409 REQUEST_ALREADY_ASSIGNED', async () => {
  const owner = await createUser({ name: 'claimtwiceowner' });
  const agent = await createUser({ name: 'claimtwiceagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const first = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);
  assert.equal(first.status, 200);

  const again = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'REQUEST_ALREADY_ASSIGNED');
  // The class 07 error contract still holds: requestId travels in the body.
  assert.equal(typeof again.body.requestId, 'string');
});

test('a terminal request cannot be claimed', async () => {
  const owner = await createUser({ name: 'claimterminalowner' });
  const agent = await createUser({ name: 'claimterminalagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  // Cancel it first (an agent may change the status).
  const cancel = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'cancelled' });
  assert.equal(cancel.status, 200);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'REQUEST_NOT_CLAIMABLE');
});

test('assignedTo in the body is rejected as a server-controlled field', async () => {
  const owner = await createUser({ name: 'claiminjectowner' });
  const agent = await createUser({ name: 'claiminjectagent', role: 'agent' });
  const other = await createUser({ name: 'claiminjectother', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ assignedTo: other.id });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'SERVER_CONTROLLED_FIELD');
});

test('the claim leaves a request_claimed event in the history', async () => {
  const owner = await createUser({ name: 'claimhistoryowner' });
  const agent = await createUser({ name: 'claimhistoryagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  const history = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(history.status, 200);
  const claimEvent = history.body.find((event) => event.type === 'request_claimed');
  assert.ok(claimEvent, 'the history must contain a request_claimed event');
  assert.equal(claimEvent.fromStatus, 'open');
  assert.equal(claimEvent.toStatus, 'in_progress');
});
