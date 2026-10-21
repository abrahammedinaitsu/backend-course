// FEATURE-206 suite: GET /requests/:id/history.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { createUser, createRequestAs, createdRequestIds } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// Shared scenario: owner creates a request, an agent changes status and
// priority, so the history carries both event types.
async function buildScenario() {
  const owner = await createUser({ name: 'howner' });
  const agent = await createUser({ name: 'hagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'in_progress' });
  await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'high' });

  return { owner, agent, ownerToken, agentToken, created };
}

test('the history requires authentication', async () => {
  const response = await request(app).get('/requests/1/history');
  assert.equal(response.status, 401);
});

test('the owner can read the history, oldest event first', async () => {
  const { ownerToken, created } = await buildScenario();

  const response = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 3);

  const [birth, transition, priority] = response.body;
  assert.equal(birth.type, 'status_changed');
  assert.equal(birth.fromStatus, null);
  assert.equal(birth.toStatus, 'open');
  assert.equal(transition.type, 'status_changed');
  assert.equal(transition.toStatus, 'in_progress');
  assert.equal(priority.type, 'priority_changed');
  assert.equal(priority.toPriority, 'high');

  // Oldest first, with ids as the stable tie-breaker.
  const times = response.body.map((event) => new Date(event.createdAt).getTime());
  const sorted = [...times].sort((a, b) => a - b);
  assert.deepEqual(times, sorted);
});

test('a stranger requester gets the same 404 as a missing request', async () => {
  const { created } = await buildScenario();
  const stranger = await createUser({ name: 'hstranger' });
  const strangerToken = await loginAs(stranger);

  const foreign = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${strangerToken}`);
  const missing = await request(app)
    .get('/requests/999999999/history')
    .set('Authorization', `Bearer ${strangerToken}`);

  // Same status, same error code: the response never reveals that the
  // foreign request exists. (The message interpolates the id you asked
  // for, which you obviously already know.)
  assert.equal(foreign.status, 404);
  assert.equal(missing.status, 404);
  assert.equal(foreign.body.error.code, missing.body.error.code);
  assert.equal(foreign.body.error.code, 'REQUEST_NOT_FOUND');
});

test('an agent can read any history', async () => {
  const { agentToken, created } = await buildScenario();

  const response = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.length >= 3, true);
});

test('a request without events answers 200 with an empty array', async () => {
  // Prepare: insert a bare row directly — the API always writes a birth
  // event, so "no events" can only be built from SQL.
  const owner = await createUser({ name: 'hempty' });
  const token = await loginAs(owner);
  const inserted = await pool.query(
    `INSERT INTO requests (title, priority, status, created_by)
     VALUES ('class06-test empty history', 'low', 'open', $1) RETURNING id`,
    [owner.id]
  );
  const requestId = Number(inserted.rows[0].id);
  createdRequestIds.push(requestId);

  const response = await request(app)
    .get(`/requests/${requestId}/history`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

test('history events never expose sensitive information', async () => {
  const { ownerToken, created } = await buildScenario();

  const response = await request(app)
    .get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${ownerToken}`);

  const text = JSON.stringify(response.body);
  for (const forbidden of ['password', 'hash', 'secret', 'token']) {
    assert.equal(text.toLowerCase().includes(forbidden), false,
      `the history response must not contain "${forbidden}"`);
  }
});
