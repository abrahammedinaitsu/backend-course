// Error contract tests — the regression suite for INC-701 and INC-702,
// plus the central error handler (OPS-703).
//
// Each test answers ONE question and follows the house style from
// test/requests.test.js: Prepare -> Act -> Check, unique data per run,
// cleanup of exactly what was created.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, createRequestAs } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';
import { pool } from '../src/database/pool.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// ------------------------------------------------- INC-701 regression

test('an alphabetic id answers 400 INVALID_REQUEST_ID, not 500', async () => {
  // Prepare: a registered user with a token.
  const owner = await createUser({ name: 'badid' });
  const token = await loginAs(owner);

  // Act: GET /requests/not-a-number.
  const response = await request(app)
    .get('/requests/not-a-number')
    .set('Authorization', `Bearer ${token}`);

  // Check: 400 with the contract code — never a 500.
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_REQUEST_ID');
  // The error carries the requestId that the request-id middleware assigned.
  assert.equal(typeof response.body.requestId, 'string');
});

test('decimal, zero and negative ids are rejected the same way', async () => {
  const owner = await createUser({ name: 'badids' });
  const token = await loginAs(owner);

  // '12abc' is the trap: parseInt('12abc') === 12, but the client sent text.
  for (const bad of ['1.5', '0', '-3', '12abc']) {
    const response = await request(app)
      .get(`/requests/${bad}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 400, `expected 400 for "${bad}"`);
    assert.equal(response.body.error.code, 'INVALID_REQUEST_ID', `expected INVALID_REQUEST_ID for "${bad}"`);
  }
});

test('a well-formed id that matches nothing still answers 404', async () => {
  // The INC-701 fix must NOT change this: invalid format (400) and a
  // missing resource (404) are different answers.
  const owner = await createUser({ name: 'missingid' });
  const token = await loginAs(owner);

  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

// ------------------------------------------------- INC-702 regression

test('an invalid priority answers 400 INVALID_PRIORITY before touching SQL', async () => {
  // Prepare: an owner with a request, an agent with a token.
  const owner = await createUser({ name: 'badprio' });
  const agent = await createUser({ name: 'badprioagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  // Act: PATCH { priority: 'critical' } as the agent.
  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'critical' });

  // Check: 400 with the contract code — the application, not the CHECK
  // constraint, rejected it.
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRIORITY');
});

test('creating with an invalid priority also answers 400 INVALID_PRIORITY', async () => {
  // Same rule on POST: creation must validate priority like PATCH does.
  const owner = await createUser({ name: 'badpriocreate' });
  const token = await loginAs(owner);

  const response = await request(app)
    .post('/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'should not be created', priority: 'urgent' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRIORITY');
});

test('a valid priority change still works after the fix', async () => {
  // A fix that breaks the valid case is not a fix.
  const owner = await createUser({ name: 'goodprio' });
  const agent = await createUser({ name: 'goodprioagent', role: 'agent' });
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

test('the CHECK constraint is still the second defense in the database', async () => {
  // The fix must not be "delete the constraint". Prove it still exists by
  // attempting an invalid write STRAIGHT to the table: PostgreSQL rejects it.
  await assert.rejects(
    () => pool.query(
      `INSERT INTO requests (title, priority, created_by)
       VALUES ($1, $2, (SELECT id FROM users LIMIT 1))`,
      ['bypass the app', 'critical']
    ),
    (error) => error.code === '23514' || /check constraint/i.test(error.message)
  );
});

// ------------------------------------------------- central error handler

test('an unexpected error answers a generic 500 without internal details', async () => {
  // Provoke an unexpected error without breaking the real database: replace
  // pool.query for one call, exactly like the validator does.
  const owner = await createUser({ name: 'boom' });
  const token = await loginAs(owner);

  const real = pool.query.bind(pool);
  pool.query = async () => { throw new Error('synthetic failure SECRET_MARKER'); };
  let response;
  try {
    response = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);
  } finally {
    pool.query = real;
  }

  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  // The internal message and stack must stay in the log, never the response.
  const raw = JSON.stringify(response.body);
  assert.equal(raw.includes('SECRET_MARKER'), false);
  assert.equal(raw.includes('at '), false);
  assert.equal('stack' in response.body, false);
});

test('every error body shares the same shape: error.code, error.message, requestId', async () => {
  const owner = await createUser({ name: 'shape' });
  const token = await loginAs(owner);

  const response = await request(app)
    .get('/requests/not-a-number')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(typeof response.body.error, 'object');
  assert.equal(typeof response.body.error.code, 'string');
  assert.equal(typeof response.body.error.message, 'string');
  assert.equal(typeof response.body.requestId, 'string');
});
