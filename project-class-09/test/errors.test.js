// Error contract tests: the regressions from INC-701 and INC-702, plus the
// behavior of the central error handler. Each test states ONE question.
//
// Prepare -> Act -> Check. Unique data per run, cleanup of exactly what was
// created, in the usual order: history -> requests -> users.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { createUser, createRequestAs } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// ------------------------------------------------- INC-701 regression

test('an alphabetic id answers 400 INVALID_REQUEST_ID, not 500', async () => {
  const user = await createUser({ name: 'badid' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests/not-a-number')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_REQUEST_ID');
});

test('decimal, zero and negative ids are rejected the same way', async () => {
  const user = await createUser({ name: 'edges' });
  const token = await loginAs(user);

  for (const bad of ['1.5', '0', '-3', '12abc']) {
    const response = await request(app)
      .get(`/requests/${bad}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 400, `expected 400 for id "${bad}"`);
    assert.equal(response.body.error.code, 'INVALID_REQUEST_ID');
  }
});

test('a well-formed id that matches nothing still answers 404', async () => {
  const user = await createUser({ name: 'missing' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

// ------------------------------------------------- INC-702 regression

test('an invalid priority answers 400 INVALID_PRIORITY before touching SQL', async () => {
  const owner = await createUser({ name: 'prio-owner' });
  const agent = await createUser({ name: 'prio-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'critical' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRIORITY');
});

test('a valid priority change still works after the fix', async () => {
  const owner = await createUser({ name: 'prio-ok-owner' });
  const agent = await createUser({ name: 'prio-ok-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken, { priority: 'low' });

  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'high' });

  assert.equal(response.status, 200);
  assert.equal(response.body.priority, 'high');
});

// ------------------------------------------------- central error handler

test('a controlled AppError keeps its category status and code', async () => {
  const owner = await createUser({ name: 'conflict-owner' });
  const agent = await createUser({ name: 'conflict-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  // open -> closed is not an allowed transition: a domain conflict.
  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'closed' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'INVALID_STATUS_TRANSITION');
});

test('an unexpected error answers a generic 500 without internal details', async (t) => {
  const user = await createUser({ name: 'boom' });
  const token = await loginAs(user);

  // Controlled sabotage: the pool fails for exactly one request. The mock
  // restores itself automatically when the test ends.
  const original = pool.query.bind(pool);
  pool.query = async () => { throw new Error('synthetic store failure'); };
  t.after(() => { pool.query = original; });

  const response = await request(app)
    .get('/requests')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  const raw = JSON.stringify(response.body);
  assert.ok(!raw.includes('synthetic store failure'), 'the internal message leaked');
  assert.ok(!raw.includes(' at '), 'a stack frame leaked into the response');
});

test('every error body shares the same shape: error.code, error.message, requestId', async () => {
  const user = await createUser({ name: 'shape' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests/0')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 400);
  assert.equal(typeof response.body.error.code, 'string');
  assert.equal(typeof response.body.error.message, 'string');
  assert.equal(typeof response.body.requestId, 'string');
});

test('a body that is not valid JSON answers 400, not 500', async () => {
  const user = await createUser({ name: 'badjson' });
  const token = await loginAs(user);

  const response = await request(app)
    .post('/requests')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send('{ "title": broken');

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});
