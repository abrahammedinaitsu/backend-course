// BUG-901 — contract freeze for behavior ADJACENT to the fix.
//
// Your change touches the detail use case. These tests pin down the
// neighbors that must keep working exactly as before: authentication,
// the scoped collection, and the claim action. If one of these goes red
// after your fix, you changed more than the ticket asked for.
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

test('a valid login still returns a usable token', async () => {
  const user = await createUser({ name: 'regression-login' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test('the collection stays scoped: a requester only lists their own requests', async () => {
  const owner = await createUser({ name: 'regression-owner' });
  const other = await createUser({ name: 'regression-other' });
  const ownerToken = await loginAs(owner);
  const otherToken = await loginAs(other);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .get('/requests')
    .set('Authorization', `Bearer ${otherToken}`);

  assert.equal(response.status, 200);
  assert.ok(
    response.body.every((item) => item.id !== created.id),
    'the collection leaked a request that belongs to another user',
  );
});

test('the claim action still follows its contract', async () => {
  const owner = await createUser({ name: 'regression-claimer-owner' });
  const agent = await createUser({ name: 'regression-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'in_progress');
  assert.equal(response.body.assignedTo, agent.id);
});
