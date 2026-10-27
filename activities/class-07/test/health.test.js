// Health and readiness tests for OPS-703.
//
// The interesting case is "/ready when the database is down" WITHOUT
// touching real credentials: createHealthRouter accepts an injectable
// checkDatabase function — we hand it one that throws, mounted on a tiny
// throwaway express() app.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import { createHealthRouter } from '../src/routes/health.routes.js';
import { pool } from '../src/database/pool.js';
import { closePool } from './helpers/cleanup.js';

after(async () => {
  await closePool();
});

test('GET /health answers 200 ok without touching PostgreSQL', async () => {
  // Bonus proof: sabotage pool.query for the test; /health must still answer.
  const real = pool.query.bind(pool);
  pool.query = async () => { throw new Error('database should not be consulted'); };
  let response;
  try {
    response = await request(app).get('/health');
  } finally {
    pool.query = real;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /ready answers 200 when PostgreSQL responds', async () => {
  // The real router, backed by the real (reachable) database.
  const response = await request(app).get('/ready');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ready', database: 'available' });
});

test('GET /ready answers 503 when the database check fails', async () => {
  // Injected failing check, on a throwaway app: no real credentials touched.
  const failing = createHealthRouter({
    checkDatabase: async () => { throw new Error('connection refused'); }
  });
  const throwaway = express();
  throwaway.use(failing);

  const response = await request(throwaway).get('/ready');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { status: 'not_ready', database: 'unavailable' });
});

test('the readiness response never reveals connection details', async () => {
  // A check that throws an error naming a host and a port: neither may leak.
  const failing = createHealthRouter({
    checkDatabase: async () => {
      throw new Error('connect ECONNREFUSED db.internal.example:5432 user=postgres');
    }
  });
  const throwaway = express();
  throwaway.use(failing);

  const response = await request(throwaway).get('/ready');

  const raw = JSON.stringify(response.body);
  assert.equal(response.status, 503);
  assert.equal(raw.includes('db.internal.example'), false);
  assert.equal(raw.includes('5432'), false);
  assert.equal(raw.includes('postgres'), false);
  assert.equal(raw.includes('ECONNREFUSED'), false);
});
