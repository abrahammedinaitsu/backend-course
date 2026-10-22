// BUG-901 — API contract for GET /requests/:id.
//
// The active tests freeze the behavior that must NOT change with your fix.
// The todo stubs are the regression tests the ticket asks you to add:
// convert them AFTER reproducing the bug, and watch them fail first.
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

test('without a token the detail returns 401', async () => {
  const response = await request(app).get('/requests/1');
  assert.equal(response.status, 401);
});

test('a well-formed id that does not exist returns 404', async () => {
  const user = await createUser({ name: 'ghost-hunter' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
});

test('the owner reads their request and the schema is preserved', async () => {
  const owner = await createUser({ name: 'detail-owner' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token, { priority: 'high' });

  const response = await request(app)
    .get(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  // Contract freeze: these keys are the public representation. Your fix
  // must not add or remove any of them for an authorized reader.
  assert.deepEqual(Object.keys(response.body).sort(), [
    'assignedTo', 'createdAt', 'createdBy', 'description',
    'id', 'priority', 'status', 'title', 'updatedAt',
  ]);
  assert.equal(response.body.createdBy, owner.id);
});

test('an agent can read any request', async () => {
  const owner = await createUser({ name: 'detail-owner-2' });
  const agent = await createUser({ name: 'detail-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .get(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, created.id);
});

test('a different requester receives the same 404 as a missing request', async () => {
  // BUG-901 regression: owner + stranger (both requesters). The stranger
  // must NOT be able to read the owner's request.
  const owner = await createUser({ name: 'detail-stranger-owner' });
  const stranger = await createUser({ name: 'detail-stranger' });
  const ownerToken = await loginAs(owner);
  const strangerToken = await loginAs(stranger);
  const created = await createRequestAs(ownerToken);

  const denied = await request(app)
    .get(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${strangerToken}`);

  assert.equal(denied.status, 404);
  assert.equal(denied.body.error.code, 'REQUEST_NOT_FOUND');

  // Indistinguishability is of status and error CODE: the response never
  // reveals that the foreign request exists. (The message interpolates the
  // id you asked for, which you already know — same as the history suite.)
  const missing = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${strangerToken}`);

  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, denied.body.error.code);
  assert.equal(denied.body.error.code, 'REQUEST_NOT_FOUND');
});

test('a userId in the query string does not grant access', async () => {
  // BUG-901 regression: the trusted identity comes ONLY from the verified
  // token. Sending the owner's id in the query must change nothing.
  const owner = await createUser({ name: 'detail-query-owner' });
  const stranger = await createUser({ name: 'detail-query-stranger' });
  const ownerToken = await loginAs(owner);
  const strangerToken = await loginAs(stranger);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .get(`/requests/${created.id}?userId=${owner.id}`)
    .set('Authorization', `Bearer ${strangerToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});
