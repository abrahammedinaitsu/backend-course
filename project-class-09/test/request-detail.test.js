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

test('a different requester receives the same 404 as a missing request', { todo: true }, async () => {
  // BUG-901 regression: create owner + stranger (both requesters), create a
  // request as the owner, GET it with the stranger's token.
  // Expected after your fix: 404 — indistinguishable from "does not exist"
  // (course decision for this system: do not confirm existence).
  // Convert me FIRST, see me fail against the bug, then fix.
});

test('a userId in the query string does not grant access', { todo: true }, async () => {
  // BUG-901 regression: stranger requests
  //   GET /requests/:id?userId=<uuid del owner>
  // The trusted identity comes ONLY from the verified token: still 404.
});
