// Final validator for class 07. It exercises the running application the
// way support tickets described it: invalid input, unexpected failures,
// traceability and operational endpoints.
//
// Guarantees:
//   - it creates its OWN synthetic users and requests (tagged), and in the
//     end deletes exactly those rows — never the seed, never your data;
//   - it never prints DATABASE_URL, JWT_SECRET, passwords, tokens or hashes;
//   - it does not modify code and does not reveal the solution;
//   - exit code 0 only when every check passes.
//
// To test "the database is down" it temporarily replaces pool.query with a
// failing function — your real database is never touched or disconnected.
import 'dotenv/config';
import crypto from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';

const TAG = `class07-validation-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const createdUserIds = [];
const createdRequestIds = [];

// The application logs JSON lines to the console; during validation they
// go to a private buffer so the report below stays readable. captureLogs
// still works: it stacks its own interception on top of this one.
const print = console.log.bind(console);
const discardedLogs = [];
console.log = (entry) => discardedLogs.push(String(entry));
console.error = (entry) => discardedLogs.push(String(entry));

const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

// ------------------------------------------------------------- helpers

async function api(method, path, { token, body, headers = {} } = {}) {
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let json = null;
  try { json = JSON.parse(raw); } catch { /* keep raw */ }
  return { status: response.status, body: json, raw, headers: response.headers };
}

let userCounter = 0;
async function registerUser(name) {
  userCounter += 1;
  const email = `${TAG}-${name}-${userCounter}@example.test`;
  const password = `frase de validacion para ${name}`;
  const response = await api('POST', '/auth/register', { body: { email, password } });
  if (response.status !== 201) {
    throw new Error(`Could not register a synthetic user (${response.status}).`);
  }
  createdUserIds.push(response.body.id);
  return { id: response.body.id, email, password };
}

async function loginUser(user) {
  const response = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password }
  });
  if (response.status !== 200) throw new Error(`Could not log in (${response.status}).`);
  return response.body.accessToken;
}

async function promoteToAgent(user) {
  // Only the validator's OWN synthetic user is promoted — never seed rows.
  await realQuery('UPDATE users SET role = $1 WHERE id = $2', ['agent', user.id]);
}

async function createRequestAs(token, fields = {}) {
  const response = await api('POST', '/requests', {
    token,
    body: { title: `${TAG} request`, ...fields }
  });
  if (response.status !== 201) {
    throw new Error(`Could not create a synthetic request (${response.status}).`);
  }
  createdRequestIds.push(response.body.id);
  return response.body;
}

// Database sabotage: replace pool.query for a controlled moment. realQuery
// keeps a direct reference so cleanup always works.
const realQuery = pool.query.bind(pool);
function breakDatabase(error) {
  pool.query = async () => { throw error; };
}
function restoreDatabase() {
  pool.query = realQuery;
}

// Log capture: temporarily intercept console.log / console.error. The
// request logger writes on the response 'finish' event, so we wait a
// moment before restoring.
async function captureLogs(fn) {
  const lines = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (line) => lines.push(String(line));
  console.error = (line) => lines.push(String(line));
  try {
    const result = await fn();
    await sleep(80);
    return { result, lines };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

// ------------------------------------------------------------- checks

const failures = [];
function detail(expected, received, review) {
  return { expected, received, review };
}

let owner, ownerToken, stranger, strangerToken, agent, agentToken, request;

const CHECKS = [
  ['Baseline', 'Existing contract preserved', async () => {
    owner = await registerUser('owner');
    stranger = await registerUser('stranger');
    agent = await registerUser('agent');
    await promoteToAgent(agent);
    ownerToken = await loginUser(owner);
    strangerToken = await loginUser(stranger);
    agentToken = await loginUser(agent);

    request = await createRequestAs(ownerToken, { priority: 'low' });

    const list = await api('GET', '/requests', { token: ownerToken });
    if (list.status !== 200 || !Array.isArray(list.body)) {
      return detail('GET /requests -> 200 with an array',
        `${list.status}`, ['the listing endpoint from class 03 onwards']);
    }
    const own = await api('GET', `/requests/${request.id}`, { token: ownerToken });
    if (own.status !== 200) {
      return detail('GET /requests/:id (owner) -> 200', `${own.status}`,
        ['ownership rules from class 05']);
    }
    const foreign = await api('GET', `/requests/${request.id}`, { token: strangerToken });
    if (foreign.status !== 404 || foreign.body?.error?.code !== 'REQUEST_NOT_FOUND') {
      return detail('GET /requests/:id (stranger) -> 404 REQUEST_NOT_FOUND',
        `${foreign.status} ${foreign.body?.error?.code ?? ''}`,
        ['a foreign request must stay indistinguishable from a missing one (class 05 contract)']);
    }
    const moved = await api('PATCH', `/requests/${request.id}`, {
      token: agentToken, body: { status: 'in_progress' }
    });
    if (moved.status !== 200) {
      return detail('PATCH status open -> in_progress (agent) -> 200', `${moved.status}`,
        ['the state machine from class 03', 'agent permissions from class 05']);
    }
    const history = await api('GET', `/requests/${request.id}/history`, { token: ownerToken });
    if (history.status !== 200 || !Array.isArray(history.body) || history.body.length < 2) {
      return detail('GET /requests/:id/history (owner) -> 200 with the recorded events',
        `${history.status}`, ['the history endpoint implemented in class 06']);
    }
    return null;
  }],

  ['Input and errors', 'Invalid id returns 400', async () => {
    for (const bad of ['not-a-number', '1.5', '0', '-3']) {
      const response = await api('GET', `/requests/${bad}`, { token: ownerToken });
      if (response.status !== 400 || response.body?.error?.code !== 'INVALID_REQUEST_ID') {
        return detail('400 INVALID_REQUEST_ID for text, decimals, zero and negatives',
          `GET /requests/${bad} -> ${response.status} ${response.body?.error?.code ?? ''}`,
          ['where request.params.id is first read',
            'whether the COMPLETE value is validated (parseInt accepts "12abc")',
            'whether SQL executes before validation']);
      }
    }
    return null;
  }],

  ['Input and errors', 'Invalid priority returns 400', async () => {
    const patch = await api('PATCH', `/requests/${request.id}`, {
      token: agentToken, body: { priority: 'critical' }
    });
    if (patch.status !== 400 || patch.body?.error?.code !== 'INVALID_PRIORITY') {
      return detail('PATCH { priority: "critical" } -> 400 INVALID_PRIORITY',
        `${patch.status} ${patch.body?.error?.code ?? ''}`,
        ['whether the application validates priority BEFORE running SQL',
          'the PostgreSQL constraint is the second defense, not the contract']);
    }
    const post = await api('POST', '/requests', {
      token: ownerToken, body: { title: `${TAG} bad priority`, priority: 'urgent' }
    });
    if (post.status === 201) createdRequestIds.push(post.body.id);
    if (post.status !== 400 || post.body?.error?.code !== 'INVALID_PRIORITY') {
      return detail('POST with priority "urgent" -> 400 INVALID_PRIORITY',
        `${post.status} ${post.body?.error?.code ?? ''}`,
        ['creation must validate priority with the same rule as PATCH']);
    }
    return null;
  }],

  ['Input and errors', 'Unknown request returns 404', async () => {
    const response = await api('GET', '/requests/999999999', { token: ownerToken });
    if (response.status !== 404 || response.body?.error?.code !== 'REQUEST_NOT_FOUND') {
      return detail('GET /requests/999999999 -> 404 REQUEST_NOT_FOUND',
        `${response.status} ${response.body?.error?.code ?? ''}`,
        ['a WELL-FORMED id that matches nothing is a missing resource, not a contract violation']);
    }
    return null;
  }],

  ['Input and errors', 'Invalid transition returns 409', async () => {
    const response = await api('PATCH', `/requests/${request.id}`, {
      token: agentToken, body: { status: 'closed' }
    });
    if (response.status !== 409) {
      return detail('PATCH in_progress -> closed -> 409', `${response.status}`,
        ['the state machine from class 03 must keep answering 409, not 400 or 500']);
    }
    return null;
  }],

  ['Input and errors', 'Unexpected errors return 500', async () => {
    breakDatabase(new Error('validator synthetic failure'));
    try {
      const response = await api('GET', '/requests', { token: ownerToken });
      captured500 = response;
      if (response.status !== 500 || response.body?.error?.code !== 'INTERNAL_ERROR') {
        return detail('a failing dependency inside a handler -> 500 INTERNAL_ERROR',
          `${response.status} ${response.body?.error?.code ?? ''}`,
          ['unknown errors must become a controlled 500, not a crash or a leaked detail']);
      }
      return null;
    } finally {
      restoreDatabase();
    }
  }],

  ['Input and errors', 'Internal details remain hidden', async () => {
    const raw = captured500?.raw ?? '';
    const leaked = ['validator synthetic failure', 'at ', 'stack', 'node_modules']
      .filter((needle) => raw.includes(needle));
    if (!captured500 || leaked.length > 0) {
      return detail('the 500 body carries only a generic code and message',
        leaked.length ? `response contains: ${leaked.join(', ')}` : 'no 500 captured',
        ['the public message must not repeat error.message',
          'error.stack belongs to the server log, never to the response']);
    }
    return null;
  }],

  ['Traceability', 'Response contains request id', async () => {
    const response = await api('GET', '/requests/999999999', { token: ownerToken });
    const headerId = response.headers.get('x-request-id');
    const bodyId = response.body?.requestId;
    if (!headerId || typeof bodyId !== 'string' || headerId !== bodyId) {
      return detail('X-Request-Id header and the SAME requestId inside the error body',
        `header ${headerId ?? 'missing'}, body ${bodyId ?? 'missing'}`,
        ['a middleware must assign the id before routes run',
          'the error handler must include it in every error body']);
    }
    return null;
  }],

  ['Traceability', 'Log contains the same request id', async () => {
    const { result, lines } = await captureLogs(() =>
      api('GET', '/requests/999999999', { token: ownerToken }));
    const headerId = result.headers.get('x-request-id');
    const jsonLines = lines.map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    const match = jsonLines.find((entry) => entry.requestId === headerId);
    if (!headerId || !match) {
      return detail('one JSON log line whose requestId equals the response header',
        headerId ? `no log line carries ${headerId}` : 'no X-Request-Id header',
        ['the request logger must log every finished request',
          'logger output must be one valid JSON object per line']);
    }
    return null;
  }],

  ['Traceability', 'Authorization header is not logged', async () => {
    const token = ownerToken;
    const { lines } = await captureLogs(async () => {
      await api('GET', '/requests', { token });
      await api('GET', '/requests/999999999', { token });
    });
    const leaky = lines.filter((line) =>
      line.includes(token) || /Bearer /.test(line) || /authorization/i.test(line));
    if (leaky.length > 0) {
      return detail('no log line contains the token or the Authorization header',
        `${leaky.length} log line(s) leak credentials`,
        ['log an explicit ALLOWLIST of fields — never the headers object',
          'a leaked token in a log is a live credential for one hour']);
    }
    return null;
  }],

  ['Operation', 'Health endpoint responds', async () => {
    // /health must answer even when the database cannot.
    breakDatabase(new Error('validator synthetic outage'));
    try {
      const response = await api('GET', '/health');
      if (response.status !== 200 || response.body?.status !== 'ok') {
        return detail('GET /health -> 200 { "status": "ok" } with the database down',
          `${response.status} ${JSON.stringify(response.body)}`,
          ['liveness must not depend on PostgreSQL',
            '/health answers "the process is alive", nothing more']);
      }
      return null;
    } finally {
      restoreDatabase();
    }
  }],

  ['Operation', 'Readiness checks PostgreSQL', async () => {
    const up = await api('GET', '/ready');
    if (up.status !== 200 || up.body?.status !== 'ready' || up.body?.database !== 'available') {
      return detail('GET /ready -> 200 { status: "ready", database: "available" }',
        `${up.status} ${JSON.stringify(up.body)}`,
        ['readiness must run a real (cheap) check such as SELECT 1']);
    }
    breakDatabase(Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }));
    try {
      const down = await api('GET', '/ready');
      if (down.status !== 503 || down.body?.status !== 'not_ready' || down.body?.database !== 'unavailable') {
        return detail('GET /ready with the check failing -> 503 { status: "not_ready" }',
          `${down.status} ${JSON.stringify(down.body)}`,
          ['a failing readiness check is an EXPECTED 503, not an unexpected 500',
            'the response must not reveal hosts, users or SQL']);
      }
      const raw = down.raw ?? '';
      if (/postgres|supabase|SELECT|ECONNREFUSED/i.test(raw)) {
        return detail('the 503 body reveals nothing about the dependency internals',
          'the readiness response leaks internal details', ['answer only status and database availability']);
      }
      return null;
    } finally {
      restoreDatabase();
    }
  }]
];

let captured500 = null;

// ------------------------------------------------------------- runner

const results = [];
let crashed = null;

try {
  for (const [section, name, fn] of CHECKS) {
    let failure = null;
    try {
      failure = await fn();
    } catch (error) {
      failure = detail('the check to run without crashing', error.message,
        ['run npm run class-07:doctor first', 'run npm test to see which behavior is missing']);
    }
    results.push([section, name, failure]);
    if (failure) failures.push([name, failure]);
  }
} catch (error) {
  crashed = error;
} finally {
  restoreDatabase();
  // -------------------------------------------------------------- cleanup
  let cleanupOk = true;
  try {
    if (createdRequestIds.length) {
      await realQuery('DELETE FROM request_history WHERE request_id = ANY($1::bigint[])', [createdRequestIds]);
      await realQuery('DELETE FROM requests WHERE id = ANY($1::bigint[])', [createdRequestIds]);
    }
    if (createdUserIds.length) {
      await realQuery('DELETE FROM request_history WHERE changed_by = ANY($1::uuid[])', [createdUserIds]);
      await realQuery('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  } catch {
    cleanupOk = false;
  }
  server.close();
  await pool.end();

  // --------------------------------------------------------------- output
  print('CLASS 07 INCIDENT VALIDATION\n');
  let index = 0;
  let currentSection = null;
  for (const [section, name, failure] of results) {
    index += 1;
    if (section !== currentSection) {
      if (currentSection !== null) print('');
      print(section);
      currentSection = section;
    }
    const label = `[${String(index).padStart(2, '0')}/12] ${name} `;
    print(`${label}${'.'.repeat(Math.max(2, 46 - label.length))} ${failure ? 'FAIL' : 'PASS'}`);
  }

  print('\nCleanup');
  print(cleanupOk
    ? 'Temporary validation data removed successfully.'
    : 'WARNING: cleanup could not run completely. Re-run the validator when the database is reachable.');

  for (const [name, failure] of failures) {
    print(`\n[FAIL] ${name}\n`);
    print('Expected:');
    print(failure.expected);
    print('\nReceived:');
    print(failure.received);
    print('\nReview:');
    for (const line of failure.review) print(`- ${line}`);
  }

  if (crashed) {
    print(`\nValidator error: ${crashed.message}`);
  }

  const passed = results.filter(([, , failure]) => !failure).length;
  print(`\nFINAL RESULT: ${passed === 12 && !crashed ? 'PASSED' : `FAILED (${passed}/12)`}`);
  process.exit(passed === 12 && !crashed ? 0 : 1);
}
