// Health and readiness tests. Two different questions, two different
// endpoints — and the readiness check is injectable, so the "database
// down" case never touches real credentials.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { createHealthRouter } from '../src/routes/health.routes.js';
import { closePool } from './helpers/cleanup.js';

after(async () => {
  await closePool();
});

test('GET /health answers 200 ok without touching PostgreSQL', async (t) => {
  // Sabotage the pool for the duration of this test: /health must not care.
  const original = pool.query.bind(pool);
  pool.query = async () => { throw new Error('database is down'); };
  t.after(() => { pool.query = original; });

  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /ready answers 200 when PostgreSQL responds', async () => {
  const response = await request(app).get('/ready');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ready', database: 'available' });
});

test('GET /ready answers 503 when the database check fails', async () => {
  // The separation from class 07: hand the router a failing check instead
  // of breaking a real connection.
  const failing = express();
  failing.use(createHealthRouter({
    checkDatabase: async () => { throw new Error('no database today'); }
  }));

  const response = await request(failing).get('/ready');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { status: 'not_ready', database: 'unavailable' });
});

test('the readiness response never reveals connection details', async () => {
  const failing = express();
  failing.use(createHealthRouter({
    checkDatabase: async () => {
      throw Object.assign(new Error('connect ECONNREFUSED db.supabase.co:5432'), {
        code: 'ECONNREFUSED'
      });
    }
  }));

  const response = await request(failing).get('/ready');
  const raw = JSON.stringify(response.body);

  assert.equal(response.status, 503);
  assert.ok(!raw.includes('supabase'), 'the host leaked into the response');
  assert.ok(!raw.includes('5432'), 'the port leaked into the response');
});
