// Traceability tests: the request id must let anyone connect a response,
// its log line and nothing else. These tests also PROVE what the logs do
// NOT contain — capturing console output during a request.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import request from 'supertest';
import app from '../src/app.js';
import { createUser } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// Captures console.log/console.error lines produced while fn runs. The
// request logger writes on the response 'finish' event, so we wait a
// moment before restoring.
async function capture(fn) {
  const lines = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (line) => lines.push(String(line));
  console.error = (line) => lines.push(String(line));
  try {
    const result = await fn();
    await sleep(60);
    return { result, lines };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

test('every response carries an X-Request-Id header', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.match(response.headers['x-request-id'], /^req_/);
});

test('an error body carries the same requestId as the header', async () => {
  const user = await createUser({ name: 'trace' });
  const token = await loginAs(user);

  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.requestId, response.headers['x-request-id']);
});

test('a well-formed client X-Request-Id is kept', async () => {
  const response = await request(app)
    .get('/health')
    .set('X-Request-Id', 'frontend-trace-42');
  assert.equal(response.headers['x-request-id'], 'frontend-trace-42');
});

test('a suspicious client X-Request-Id is replaced, never trusted', async () => {
  const response = await request(app)
    .get('/health')
    .set('X-Request-Id', 'x'.repeat(300));
  assert.match(response.headers['x-request-id'], /^req_/);
});

test('the log line of a request carries the same requestId as the response', async () => {
  const user = await createUser({ name: 'tracelog' });
  const token = await loginAs(user);

  const { result, lines } = await capture(() =>
    request(app).get('/requests').set('Authorization', `Bearer ${token}`));

  const headerId = result.headers['x-request-id'];
  const parsed = lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
  const match = parsed.find((entry) => entry.requestId === headerId);

  assert.ok(match, 'no JSON log line carries the response requestId');
  assert.equal(match.event, 'request_completed');
  assert.equal(match.status, 200);
});

test('the Authorization header and the token never reach the log', async () => {
  const user = await createUser({ name: 'noleak' });
  const token = await loginAs(user);

  const { lines } = await capture(async () => {
    await request(app).get('/requests').set('Authorization', `Bearer ${token}`);
    await request(app).get('/requests/999999999').set('Authorization', `Bearer ${token}`);
  });

  for (const line of lines) {
    assert.ok(!line.includes(token), 'the raw token appeared in a log line');
    assert.ok(!/Bearer /.test(line), 'an Authorization value appeared in a log line');
  }
});
