// Final validator for class 08. It verifies three things, in this order:
// the PREVIOUS behavior still works (refactoring must not change it), the
// claim action fulfils its whole matrix, and the architectural boundaries
// hold (routes without SQL, service without Express).
//
// Guarantees (same contract as the class 06/07 validators):
//   - synthetic, tagged users/requests only; cleanup ALWAYS runs;
//   - never prints secrets; never reveals the solution;
//   - exit code 0 only when every check passes.
//
// The boundary checks are deliberately simple text checks — transparent
// enough that you can read them and understand exactly what they demand.
import 'dotenv/config';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = `class08-validation-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const createdUserIds = [];
const createdRequestIds = [];

// App logs go to a private buffer so the report stays readable.
const print = console.log.bind(console);
const discardedLogs = [];
console.log = (entry) => discardedLogs.push(String(entry));
console.error = (entry) => discardedLogs.push(String(entry));

const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const realQuery = pool.query.bind(pool);

// ------------------------------------------------------------- helpers

async function api(method, urlPath, { token, body } = {}) {
  // Check 02 blocks the event loop while the test suite runs; any kept-alive
  // socket dies meanwhile. One connection per request keeps this immune.
  const headers = { connection: 'close' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${BASE}${urlPath}`, {
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

// ------------------------------------------------------------- checks

const failures = [];
function detail(expected, received, review) {
  return { expected, received, review };
}

let owner, ownerToken, stranger, strangerToken, agent, agentToken;
let claimTarget, claimed;

const CHECKS = [
  ['Baseline', 'Previous behavior preserved', async () => {
    owner = await registerUser('owner');
    stranger = await registerUser('stranger');
    agent = await registerUser('agent');
    await promoteToAgent(agent);
    ownerToken = await loginUser(owner);
    strangerToken = await loginUser(stranger);
    agentToken = await loginUser(agent);

    const probe = await createRequestAs(ownerToken, { priority: 'low' });

    const list = await api('GET', '/requests', { token: ownerToken });
    if (list.status !== 200 || !Array.isArray(list.body)) {
      return detail('GET /requests -> 200 with an array', `${list.status}`,
        ['the listing contract from class 03 onwards']);
    }
    const foreign = await api('GET', `/requests/${probe.id}`, { token: strangerToken });
    if (foreign.status !== 404 || foreign.body?.error?.code !== 'REQUEST_NOT_FOUND') {
      return detail('foreign request -> 404 REQUEST_NOT_FOUND',
        `${foreign.status} ${foreign.body?.error?.code ?? ''}`,
        ['the ownership contract from class 05 must survive every refactor']);
    }
    const badId = await api('GET', '/requests/not-a-number', { token: ownerToken });
    if (badId.status !== 400 || badId.body?.error?.code !== 'INVALID_REQUEST_ID'
      || typeof badId.body?.requestId !== 'string') {
      return detail('invalid id -> 400 INVALID_REQUEST_ID with requestId in the body',
        `${badId.status} ${badId.body?.error?.code ?? ''}`,
        ['the class 07 error contract (code + requestId) must stay intact']);
    }
    const moved = await api('PATCH', `/requests/${probe.id}`, {
      token: agentToken, body: { status: 'in_progress' }
    });
    if (moved.status !== 200) {
      return detail('PATCH status open -> in_progress (agent) -> 200', `${moved.status}`,
        ['the state machine and agent permissions from classes 03/05']);
    }
    const history = await api('GET', `/requests/${probe.id}/history`, { token: ownerToken });
    if (history.status !== 200 || !Array.isArray(history.body) || history.body.length < 2) {
      return detail('GET /requests/:id/history (owner) -> 200 with recorded events',
        `${history.status}`, ['the history endpoint from class 06']);
    }
    return null;
  }],

  ['Baseline', 'Existing tests pass', async () => {
    try {
      execSync(`node --test --test-concurrency=1 "test/*.test.js"`, {
        cwd: ROOT, stdio: 'pipe', timeout: 180000
      });
      return null;
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      const failing = (output.match(/^not ok.*$/gm) ?? []).slice(0, 3).join(' | ');
      return detail('npm test fully green', failing || 'the suite exited with failures',
        ['run npm test yourself and read the first failing test',
          'a refactor that breaks a test changed observable behavior']);
    }
  }],

  ['Claim request', 'Authentication required', async () => {
    const target = await createRequestAs(ownerToken);
    claimTarget = target;
    const response = await api('POST', `/requests/${target.id}/claim`);
    if (response.status !== 401) {
      return detail('POST /requests/:id/claim without token -> 401', `${response.status}`,
        ['the claim route must live behind authenticate, like every /requests route']);
    }
    return null;
  }],

  ['Claim request', 'Requester cannot claim', async () => {
    const response = await api('POST', `/requests/${claimTarget.id}/claim`, { token: ownerToken });
    if (response.status !== 403) {
      return detail('claim as requester -> 403', `${response.status} ${response.body?.error?.code ?? ''}`,
        ['the role rule belongs to the claim policy: only agents claim']);
    }
    return null;
  }],

  ['Claim request', 'Agent can claim open request', async () => {
    const response = await api('POST', `/requests/${claimTarget.id}/claim`, { token: agentToken });
    claimed = response;
    if (response.status !== 200 || !response.body?.assignedTo) {
      return detail('claim as agent on an open request -> 200 with assignedTo',
        `${response.status} assignedTo=${response.body?.assignedTo ?? 'missing'}`,
        ['the service coordinates: fetch, policy, consistent store operation',
          'the representation must expose assignedTo after migration 005']);
    }
    return null;
  }],

  ['Claim request', 'Agent id comes from token', async () => {
    if (claimed?.body?.assignedTo !== agent.id) {
      return detail('assignedTo equals the AUTHENTICATED agent id',
        `assignedTo=${claimed?.body?.assignedTo}`,
        ['identity comes from req.auth, never from the body']);
    }
    const fresh = await createRequestAs(ownerToken);
    const injected = await api('POST', `/requests/${fresh.id}/claim`, {
      token: agentToken, body: { assignedTo: stranger.id }
    });
    if (injected.status !== 400 || injected.body?.error?.code !== 'SERVER_CONTROLLED_FIELD') {
      return detail('claim with assignedTo in the body -> 400 SERVER_CONTROLLED_FIELD',
        `${injected.status} ${injected.body?.error?.code ?? ''}`,
        ['assignedTo is server-controlled: rejecting it makes the contract visible']);
    }
    return null;
  }],

  ['Claim request', 'Request becomes in_progress', async () => {
    const after = await api('GET', `/requests/${claimTarget.id}`, { token: agentToken });
    if (after.status !== 200 || after.body?.status !== 'in_progress') {
      return detail('the claimed request reads back as in_progress',
        `${after.status} status=${after.body?.status ?? ''}`,
        ['claim updates assignment AND status in one consistent operation']);
    }
    if (!(new Date(after.body.updatedAt) > new Date(claimTarget.updatedAt))) {
      return detail('updatedAt advanced with the claim',
        `updatedAt=${after.body.updatedAt}`,
        ['the UPDATE must refresh updated_at like every write since class 04']);
    }
    return null;
  }],

  ['Claim request', 'Second claim returns conflict', async () => {
    const again = await api('POST', `/requests/${claimTarget.id}/claim`, { token: agentToken });
    if (again.status !== 409 || again.body?.error?.code !== 'REQUEST_ALREADY_ASSIGNED') {
      return detail('claiming an assigned request -> 409 REQUEST_ALREADY_ASSIGNED',
        `${again.status} ${again.body?.error?.code ?? ''}`,
        ['the policy distinguishes ALREADY_ASSIGNED from NOT_OPEN']);
    }
    return null;
  }],

  ['Claim request', 'Terminal request cannot be claimed', async () => {
    const doomed = await createRequestAs(ownerToken);
    const cancel = await api('PATCH', `/requests/${doomed.id}`, {
      token: agentToken, body: { status: 'cancelled' }
    });
    if (cancel.status !== 200) {
      return detail('preparing a cancelled request (PATCH) -> 200', `${cancel.status}`,
        ['the state machine must still allow open -> cancelled']);
    }
    const response = await api('POST', `/requests/${doomed.id}/claim`, { token: agentToken });
    if (response.status !== 409) {
      return detail('claiming a cancelled request -> 409',
        `${response.status} ${response.body?.error?.code ?? ''}`,
        ['a terminal request is not claimable: the lifecycle rule lives in the policy']);
    }
    const missing = await api('POST', '/requests/999999999/claim', { token: agentToken });
    if (missing.status !== 404) {
      return detail('claiming a nonexistent request -> 404', `${missing.status}`,
        ['existence is checked before the policy runs']);
    }
    return null;
  }],

  ['Claim request', 'History event is created', async () => {
    const history = await api('GET', `/requests/${claimTarget.id}/history`, { token: ownerToken });
    const events = Array.isArray(history.body) ? history.body : [];
    const claimEvent = events.find((event) => event.type === 'request_claimed');
    if (!claimEvent || claimEvent.fromStatus !== 'open' || claimEvent.toStatus !== 'in_progress') {
      return detail('history contains a request_claimed event (open -> in_progress)',
        claimEvent ? JSON.stringify(claimEvent) : 'no request_claimed event',
        ['assignment and history live in the SAME transaction',
          'migration 005 widened the history type constraint for this event']);
    }
    return null;
  }],

  ['Boundaries', 'Routes contain no SQL', async () => {
    const source = readFileSync(path.join(ROOT, 'src/modules/requests/requests.routes.js'), 'utf8');
    const offenders = [];
    if (/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i.test(source)) offenders.push('SQL keywords');
    if (/pool\s*\.\s*query|database\/pool/.test(source)) offenders.push('direct pool access');
    if (offenders.length) {
      return detail('src/modules/requests/requests.routes.js free of SQL and pool access',
        `found: ${offenders.join(', ')}`,
        ['SQL belongs to the store; the route translates HTTP and calls the service']);
    }
    return null;
  }],

  ['Boundaries', 'Service does not depend on Express', async () => {
    const source = readFileSync(path.join(ROOT, 'src/modules/requests/requests.service.js'), 'utf8');
    const offenders = [];
    if (/from\s+['"]express['"]|require\(\s*['"]express['"]\s*\)/.test(source)) offenders.push('imports express');
    if (/\breq\s*\.\s*(params|body|headers|query)\b/.test(source)) offenders.push('reads the request object');
    if (/\bres\s*\.\s*(status|json|send)\b/.test(source)) offenders.push('writes the response object');
    if (offenders.length) {
      return detail('src/modules/requests/requests.service.js free of Express knowledge',
        `found: ${offenders.join(', ')}`,
        ['the service receives plain values (actor, id, body) and returns data or throws AppError']);
    }
    return null;
  }]
];

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
        ['run npm run class-08:doctor first', 'run npm test to see which behavior is missing']);
    }
    results.push([section, name, failure]);
    if (failure) failures.push([name, failure]);
  }
} catch (error) {
  crashed = error;
} finally {
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

  print('CLASS 08 ARCHITECTURE VALIDATION\n');
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

  if (crashed) print(`\nValidator error: ${crashed.message}`);

  const passed = results.filter(([, , failure]) => !failure).length;
  print(`\nFINAL RESULT: ${passed === 12 && !crashed ? 'PASSED' : `FAILED (${passed}/12)`}`);
  process.exit(passed === 12 && !crashed ? 0 : 1);
}
