// Traceability tests for OPS-703.
//
// The hard part is not asserting what the logs contain, but what they do
// NOT contain: capture console.log/console.error during a request and
// inspect the lines. The request logger writes on the response 'finish'
// event, so we wait a few milliseconds before restoring the console.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createUser } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// Capture everything the app logs while `fn` runs, then wait one tick so
// the 'finish' handler has written its line before we restore the console.
async function captureLogs(fn) {
  const lines = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (line) => lines.push(String(line));
  console.error = (line) => lines.push(String(line));
  try {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, 60));
    return { result, lines };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

test('every response carries an X-Request-Id header', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(typeof response.headers['x-request-id'], 'string');
  assert.ok(response.headers['x-request-id'].length > 0);
});

test('an error body carries the same requestId as the header', async () => {
  const owner = await createUser({ name: 'traceid' });
  const token = await loginAs(owner);

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
  const junk = 'x'.repeat(300);
  const response = await request(app)
    .get('/health')
    .set('X-Request-Id', junk);

  assert.notEqual(response.headers['x-request-id'], junk);
  // A server-generated id has the documented shape.
  assert.match(response.headers['x-request-id'], /^req_[a-f0-9-]+$/);
});

test('the log line of a request carries the same requestId as the response', async () => {
  const { result, lines } = await captureLogs(() => request(app).get('/health'));

  const headerId = result.headers['x-request-id'];
  const jsonLines = lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
  const match = jsonLines.find((entry) => entry.requestId === headerId);

  assert.ok(headerId, 'the response must carry an X-Request-Id');
  assert.ok(match, `no log line carried the requestId ${headerId}`);
  // The structured line carries the allowlisted operational fields.
  assert.equal(match.event, 'request_completed');
  assert.equal(match.path, '/health');
  assert.equal(match.status, 200);
});

test('the Authorization header and the token never reach the log', async () => {
  const owner = await createUser({ name: 'tracesecret' });
  const token = await loginAs(owner);

  const { lines } = await captureLogs(async () => {
    await request(app).get('/requests').set('Authorization', `Bearer ${token}`);
    await request(app).get('/requests/999999999').set('Authorization', `Bearer ${token}`);
  });

  const leaky = lines.filter((line) =>
    line.includes(token) || /Bearer /.test(line) || /authorization/i.test(line));

  assert.equal(leaky.length, 0, `a log line leaked credentials: ${leaky.join(' | ')}`);
});
