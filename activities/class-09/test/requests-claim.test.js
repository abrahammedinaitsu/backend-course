// API tests for FEATURE-801 (claim). The full behavior matrix, through
// HTTP: roles, states, assignment, server-controlled fields, history and
// the class 07 error contract.
import test, { after } from 'node:test';
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

async function scenario() {
  const owner = await createUser({ name: 'claim-owner' });
  const agent = await createUser({ name: 'claim-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);
  return { owner, agent, ownerToken, agentToken, created };
}

test('claim requires authentication', async () => {
  const { created } = await scenario();
  const response = await request(app).post(`/requests/${created.id}/claim`);
  assert.equal(response.status, 401);
});

test('a requester cannot claim a request', async () => {
  const { created, ownerToken } = await scenario();
  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(response.status, 403);
});

test('an agent claims an open request: 200, assignedTo from the token, in_progress', async () => {
  const { created, agent, agentToken } = await scenario();
  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.assignedTo, agent.id);
  assert.equal(response.body.status, 'in_progress');
  assert.ok(new Date(response.body.updatedAt) >= new Date(created.updatedAt));
});

test('claiming a nonexistent request answers 404', async () => {
  const { agentToken } = await scenario();
  const response = await request(app)
    .post('/requests/999999999/claim')
    .set('Authorization', `Bearer ${agentToken}`);
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

test('a second claim answers 409 REQUEST_ALREADY_ASSIGNED', async () => {
  const { created, agentToken } = await scenario();
  await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  const again = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'REQUEST_ALREADY_ASSIGNED');
  assert.equal(typeof again.body.requestId, 'string');
});

test('a terminal request cannot be claimed', async () => {
  const { created, agentToken } = await scenario();
  const cancelled = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'cancelled' });
  assert.equal(cancelled.status, 200);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'REQUEST_NOT_CLAIMABLE');
});

test('assignedTo in the body is rejected as a server-controlled field', async () => {
  const { created, owner, agentToken } = await scenario();
  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ assignedTo: owner.id });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'SERVER_CONTROLLED_FIELD');
});

test('the claim leaves a request_claimed event in the history', async () => {
  const { created, ownerToken, agentToken } = await scenario();
  await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  const history = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(history.status, 200);
  const event = history.body.find((entry) => entry.type === 'request_claimed');
  assert.ok(event, 'no request_claimed event in the history');
  assert.equal(event.fromStatus, 'open');
  assert.equal(event.toStatus, 'in_progress');
});

test('assignedTo also stays server-controlled for PATCH', async () => {
  const { created, agent, agentToken } = await scenario();
  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ assignedTo: agent.id, status: 'in_progress' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'SERVER_CONTROLLED_FIELD');
});
