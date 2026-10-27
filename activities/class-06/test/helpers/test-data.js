// Test data factory. Every run uses UNIQUE identifiers (a random runId in
// each email) so tests never collide with the seed, with other tests, or
// with a previous crashed run. Every created id is recorded for cleanup.
import crypto from 'node:crypto';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/database/pool.js';

export const createdUserIds = [];
export const createdRequestIds = [];

const runId = crypto.randomUUID().slice(0, 8);
let counter = 0;

export function uniqueEmail(name) {
  counter += 1;
  return `class06-test-${runId}-${name}-${counter}@example.test`;
}

export async function createUser({ name = 'user', role = 'requester' } = {}) {
  const email = uniqueEmail(name);
  const password = `una frase de prueba para ${name}`;
  const response = await request(app)
    .post('/auth/register')
    .send({ email, password });
  if (response.status !== 201) {
    throw new Error(`Could not register test user (${response.status}).`);
  }
  const id = response.body.id;
  createdUserIds.push(id);

  // Registration always creates 'requester' (that rule has its own tests).
  // Tests that need an agent promote their OWN synthetic user directly.
  if (role === 'agent') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['agent', id]);
  }
  return { id, email, password, role };
}

export async function createRequestAs(token, fields = {}) {
  const response = await request(app)
    .post('/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: `class06-test-${runId} request`, ...fields });
  if (response.status !== 201) {
    throw new Error(`Could not create test request (${response.status}).`);
  }
  createdRequestIds.push(response.body.id);
  return response.body;
}
