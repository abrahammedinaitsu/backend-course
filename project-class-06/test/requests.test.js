// Requests suite: ownership, authorization and the collection contract.
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

test('a requester can create a request and becomes its owner', async () => {
  const owner = await createUser({ name: 'owner' });
  const token = await loginAs(owner);

  const created = await createRequestAs(token, { priority: 'high' });

  assert.equal(created.createdBy, owner.id);
  assert.equal(created.status, 'open');
  assert.equal(created.priority, 'high');
});

test('the owner can read their own request', async () => {
  const owner = await createUser({ name: 'reader' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token);

  const response = await request(app)
    .get(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, created.id);
});

test('a requester cannot access another user request', async () => {
  // Prepare
  const owner = await createUser({ name: 'victim' });
  const stranger = await createUser({ name: 'stranger' });
  const ownerToken = await loginAs(owner);
  const strangerToken = await loginAs(stranger);
  const savedRequest = await createRequestAs(ownerToken);

  // Act
  const response = await request(app)
    .get(`/requests/${savedRequest.id}`)
    .set('Authorization', `Bearer ${strangerToken}`);

  // Check
  assert.equal(response.status, 404);
});

test('the collection requires a Bearer token', async () => {
  const response = await request(app).get('/requests');
  assert.equal(response.status, 401);
});

test('a requester cannot change the priority, even of their own request', async () => {
  const owner = await createUser({ name: 'nopriority' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token);

  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ priority: 'low' });

  assert.equal(response.status, 403);
});

test('an agent can move a request through a valid transition', async () => {
  const owner = await createUser({ name: 'transowner' });
  const agent = await createUser({ name: 'agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'in_progress' });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'in_progress');
});

// --- BUG-106 regression ---------------------------------------------------
// A valid filter with zero matches is an EMPTY COLLECTION, not a missing
// resource. Before the fix the service threw REQUEST_NOT_FOUND (404) whenever
// findAll returned no rows, breaking the class 03 collection contract.
// This test fails on the buggy code and passes on the fix.
test('a valid collection filter with zero matches answers 200 [] (BUG-106)', async () => {
  // Prepare: a fresh requester owns no requests at all.
  const owner = await createUser({ name: 'emptyfillter' });
  const token = await loginAs(owner);

  // Act: a VALID status filter that simply matches nothing for this owner.
  const response = await request(app)
    .get('/requests?status=closed')
    .set('Authorization', `Bearer ${token}`);

  // Check: 200 with a real empty array — NOT 404.
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

// --- FEATURE-206 · GET /requests/:id/history ------------------------------

test('the owner can read their own request history, oldest first', async () => {
  const owner = await createUser({ name: 'histowner' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token);

  const response = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  // Creation records the birth event: NULL -> open.
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].type, 'status_changed');
  assert.equal(response.body[0].fromStatus, null);
  assert.equal(response.body[0].toStatus, 'open');
  // The contract does NOT expose the internal actor.
  assert.equal('changedBy' in response.body[0], false);
});

test('a requester cannot read another user history (same 404 as the request)', async () => {
  const owner = await createUser({ name: 'histvictim' });
  const stranger = await createUser({ name: 'histstranger' });
  const ownerToken = await loginAs(owner);
  const strangerToken = await loginAs(stranger);
  const savedRequest = await createRequestAs(ownerToken);

  const response = await request(app)
    .get(`/requests/${savedRequest.id}/history`)
    .set('Authorization', `Bearer ${strangerToken}`);

  assert.equal(response.status, 404);
});

test('an agent can read any request history', async () => {
  const owner = await createUser({ name: 'histanyowner' });
  const agent = await createUser({ name: 'histanyagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test('a missing request history answers 404', async () => {
  const owner = await createUser({ name: 'histmissing' });
  const token = await loginAs(owner);

  const response = await request(app)
    .get('/requests/999999999/history')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
});

test('the history endpoint requires a Bearer token', async () => {
  const response = await request(app).get('/requests/1/history');
  assert.equal(response.status, 401);
});
