// Authentication suite. Each test prepares its own data with unique emails,
// and the cleanup removes ONLY what this run created.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, uniqueEmail } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

test('registering a new account answers 201 with role requester', async () => {
  // Prepare
  const email = uniqueEmail('register');

  // Act
  const response = await request(app)
    .post('/auth/register')
    .send({ email, password: 'una frase de prueba larga' });

  // Check
  assert.equal(response.status, 201);
  assert.equal(response.body.role, 'requester');
  assert.equal(response.body.email, email);
  assert.equal('passwordHash' in response.body, false);

  // This user was created outside createUser(): record it for cleanup.
  const { createdUserIds } = await import('./helpers/test-data.js');
  createdUserIds.push(response.body.id);
});

test('registering the same email twice answers a generic 409', async () => {
  const user = await createUser({ name: 'duplicate' });

  const response = await request(app)
    .post('/auth/register')
    .send({ email: user.email, password: 'otra frase de prueba larga' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'ACCOUNT_CANNOT_BE_CREATED');
});

test('sending a role at registration is rejected explicitly', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({ email: uniqueEmail('escalation'), password: 'una frase de prueba larga', role: 'agent' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'SERVER_CONTROLLED_FIELD');
});

test('logging in with valid credentials answers a Bearer token', async () => {
  const user = await createUser({ name: 'login' });

  const response = await request(app)
    .post('/auth/login')
    .send({ email: user.email, password: user.password });

  assert.equal(response.status, 200);
  assert.equal(response.body.tokenType, 'Bearer');
  assert.equal(typeof response.body.accessToken, 'string');
  assert.equal(response.body.accessToken.split('.').length, 3);
});

test('logging in with a wrong password answers a generic 401', async () => {
  const user = await createUser({ name: 'badlogin' });

  const response = await request(app)
    .post('/auth/login')
    .send({ email: user.email, password: 'esta no es la frase correcta' });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('GET /auth/me reports the identity carried by the token', async () => {
  const user = await createUser({ name: 'me' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, user.id);
  assert.equal(response.body.role, 'requester');
  assert.equal('passwordHash' in response.body, false);
});

test('GET /auth/me without a token answers 401', async () => {
  const response = await request(app).get('/auth/me');
  assert.equal(response.status, 401);
});
