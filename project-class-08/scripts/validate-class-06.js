// Class 06 final validator. Black-box: it starts YOUR application against
// YOUR database, creates its own temporary data (tagged, unique per run),
// exercises the regression fix and the history endpoint, and cleans up in
// a guaranteed block. It never touches the seed, never drops anything,
// never prints secrets, and never shows the solution.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { pool } from '../src/database/pool.js';

const TAG = `class06-validation-${Date.now()}-${randomBytes(3).toString('hex')}`;

let server = null;
let baseUrl = null;

async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { status: response.status, body: json, text };
}

class CheckFailure extends Error {
  constructor(expected, received, review) {
    super(expected);
    this.expected = expected;
    this.received = received;
    this.review = review;
  }
}
const fail = (expected, received, review) => { throw new CheckFailure(expected, received, review); };

const ctx = {};
let userCounter = 0;

async function registerUser(name) {
  userCounter += 1;
  const identity = {
    email: `${TAG}-${name}-${userCounter}@example.test`,
    password: `frase de validacion para ${name}`
  };
  const res = await api('POST', '/auth/register', { body: identity });
  if (res.status !== 201) {
    fail('The validator can register a temporary user.',
      `POST /auth/register answered ${res.status}.`,
      ['the register contract', 'the doctor output (is the environment ready?)']);
  }
  identity.id = res.body.id;
  const login = await api('POST', '/auth/login', { body: { email: identity.email, password: identity.password } });
  if (login.status !== 200) {
    fail('The validator can log in as its temporary user.',
      `POST /auth/login answered ${login.status}.`, ['the login contract']);
  }
  identity.token = login.body.accessToken;
  return identity;
}

async function buildHistoryScenario() {
  if (ctx.created) return;
  ctx.owner = await registerUser('owner');
  ctx.stranger = await registerUser('stranger');
  ctx.agent = await registerUser('agent');
  // Teacher-style promotion of the validator's OWN synthetic user.
  await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['agent', ctx.agent.email]);
  const relog = await api('POST', '/auth/login', { body: { email: ctx.agent.email, password: ctx.agent.password } });
  ctx.agent.token = relog.body.accessToken;

  const created = await api('POST', '/requests', {
    token: ctx.owner.token, body: { title: `${TAG} printer down`, priority: 'medium' }
  });
  if (created.status !== 201) {
    fail('The validator can create a temporary request.',
      `POST /requests answered ${created.status}.`, ['the create contract']);
  }
  ctx.created = created.body;

  const step1 = await api('PATCH', `/requests/${ctx.created.id}`, {
    token: ctx.agent.token, body: { status: 'in_progress' }
  });
  const step2 = await api('PATCH', `/requests/${ctx.created.id}`, {
    token: ctx.agent.token, body: { priority: 'high' }
  });
  if (step1.status !== 200 || step2.status !== 200) {
    fail('The agent can change status and priority (the history needs events).',
      `PATCH answered ${step1.status} and ${step2.status}.`,
      ['the agent permissions from class 5', 'the state machine']);
  }
}

const CHECKS = [
  ['Environment', 'Database is reachable', async () => {
    await pool.query('SELECT 1');
  }],
  ['Environment', 'Migrations are complete', async () => {
    const { readdirSync } = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const ledger = await pool.query(`SELECT to_regclass('schema_migrations') AS t`);
    if (!ledger.rows[0].t) {
      fail('The schema_migrations ledger exists.', 'It does not exist yet.',
        ['npm run db:migrate']);
    }
    const applied = await pool.query('SELECT name FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.name));
    const pending = files.filter((f) => !appliedSet.has(f));
    if (pending.length) {
      fail('Every migration file has been applied.',
        `${pending.length} migration(s) are pending (first: ${pending[0]}).`,
        ['npm run db:migrate']);
    }
  }],
  ['Environment', 'Seed data is available', async () => {
    const users = await pool.query(
      `SELECT count(*)::int AS n FROM users WHERE email LIKE '%.seed@example.test'`);
    const requests = await pool.query(
      `SELECT count(*)::int AS n FROM requests
       WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%.seed@example.test')`);
    if (users.rows[0].n < 3 || requests.rows[0].n < 4) {
      fail('The workshop seed exists (3 users, several requests).',
        `Found ${users.rows[0].n} seed user(s) and ${requests.rows[0].n} seed request(s).`,
        ['npm run db:seed']);
    }
  }],

  ['Regression', 'Valid empty collection returns 200', async () => {
    ctx.loner = await registerUser('loner');
    const res = await api('GET', '/requests?status=closed', { token: ctx.loner.token });
    ctx.emptyList = res;
    if (res.status !== 200) {
      fail('A valid filter with zero matches answers 200.',
        `GET /requests?status=closed answered ${res.status}.`,
        ['the difference between a missing resource and an empty collection',
          'where the collection route decides what to do with an empty array',
          'the class 3 contract for collections']);
    }
  }],
  ['Regression', 'Empty collection returns []', async () => {
    const res = ctx.emptyList ?? await api('GET', '/requests?status=closed', { token: ctx.loner.token });
    if (!Array.isArray(res.body) || res.body.length !== 0) {
      fail('The body of an empty collection is exactly [].',
        'The body is not an empty array.',
        ['what the route sends when there are no rows']);
    }
  }],

  ['History endpoint', 'Authentication is required', async () => {
    const res = await api('GET', '/requests/1/history');
    if (res.status !== 401) {
      fail('GET /requests/:id/history without a token answers 401.',
        `It answered ${res.status}.`,
        ['whether the new route sits behind the authenticate middleware']);
    }
  }],
  ['History endpoint', 'Owner can read history', async () => {
    await buildHistoryScenario();
    const res = await api('GET', `/requests/${ctx.created.id}/history`, { token: ctx.owner.token });
    ctx.ownerHistory = res;
    if (res.status !== 200 || !Array.isArray(res.body) || res.body.length < 3) {
      fail('The owner reads the full history of their own request (3 events).',
        `It answered ${res.status} with ${Array.isArray(res.body) ? res.body.length : 'no'} event(s).`,
        ['the route registration', 'the history query', 'whether PATCH records events']);
    }
  }],
  ['History endpoint', 'Stranger cannot read history', async () => {
    await buildHistoryScenario();
    const foreign = await api('GET', `/requests/${ctx.created.id}/history`, { token: ctx.stranger.token });
    const missing = await api('GET', '/requests/999999999/history', { token: ctx.stranger.token });
    const sameShape = foreign.body?.error?.code === missing.body?.error?.code
      && foreign.body?.error?.code === 'REQUEST_NOT_FOUND';
    if (foreign.status !== 404 || missing.status !== 404 || !sameShape) {
      fail("A stranger gets the SAME 404 as a missing request.",
        `Foreign answered ${foreign.status} (${foreign.body?.error?.code}); missing answered ${missing.status} (${missing.body?.error?.code}).`,
        ['the existing visibility policy (reuse it, do not invent a new rule)',
          'the class 5 contract: existence is not revealed']);
    }
  }],
  ['History endpoint', 'Agent can read history', async () => {
    await buildHistoryScenario();
    const res = await api('GET', `/requests/${ctx.created.id}/history`, { token: ctx.agent.token });
    if (res.status !== 200) {
      fail('An agent can read any history.', `It answered ${res.status}.`,
        ['the policy for agents']);
    }
  }],
  ['History endpoint', 'Missing request returns 404', async () => {
    await buildHistoryScenario();
    const res = await api('GET', '/requests/999999999/history', { token: ctx.owner.token });
    if (res.status !== 404) {
      fail('A missing request answers 404.', `It answered ${res.status}.`,
        ['whether the route loads the request before reading events']);
    }
  }],
  ['History endpoint', 'Events are ordered correctly', async () => {
    await buildHistoryScenario();
    const res = ctx.ownerHistory;
    const events = res.body;
    const times = events.map((e) => new Date(e.createdAt).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    const chronological = JSON.stringify(times) === JSON.stringify(sorted);
    const birthFirst = events[0]?.type === 'status_changed' && events[0]?.fromStatus === null;
    if (!chronological || !birthFirst) {
      fail('oldest event first', 'newest event first (or the birth event is not first)',
        ['the SQL ORDER BY clause',
          'the field used for chronological ordering',
          'the response contract']);
    }
  }],
  ['History endpoint', 'Sensitive information is hidden', async () => {
    await buildHistoryScenario();
    const res = ctx.ownerHistory;
    const text = res.text.toLowerCase();
    for (const forbidden of ['password', 'hash', 'secret', 'jwt']) {
      if (text.includes(forbidden)) {
        fail('History events expose only their own fields.',
          `The response contains the word "${forbidden}".`,
          ['what the history mapper exposes', 'what it deliberately drops']);
      }
    }
  }]
];

async function cleanup() {
  if (userCounter === 0) return;
  try {
    const emailTag = `${TAG}-%`;
    const titleTag = `${TAG}%`;
    await pool.query(
      `DELETE FROM request_history
       WHERE request_id IN (SELECT id FROM requests WHERE title LIKE $1)
          OR changed_by IN (SELECT id FROM users WHERE email LIKE $2)`,
      [titleTag, emailTag]);
    await pool.query(
      `DELETE FROM requests
       WHERE title LIKE $1
          OR created_by IN (SELECT id FROM users WHERE email LIKE $2)`,
      [titleTag, emailTag]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', [emailTag]);
    console.log('\nCleanup');
    console.log('Temporary validation data removed successfully.');
  } catch (error) {
    console.error('\nCleanup warning:', error.code ?? error.message);
  }
}

async function main() {
  console.log('CLASS 06 FINAL VALIDATION');

  const { default: app } = await import('../src/app.js');
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  let passed = 0;
  let section = null;
  for (let i = 0; i < CHECKS.length; i += 1) {
    const [group, name, run] = CHECKS[i];
    if (group !== section) {
      section = group;
      console.log(`\n${section}`);
    }
    const label = `[${String(i + 1).padStart(2, '0')}/12] ${name} `;
    try {
      await run();
      console.log(`${label}${'.'.repeat(Math.max(2, 44 - label.length))} PASS`);
      passed += 1;
    } catch (error) {
      console.log(`${label}${'.'.repeat(Math.max(2, 44 - label.length))} FAIL`);
      if (error instanceof CheckFailure) {
        console.log('\nExpected:');
        console.log(error.expected);
        console.log('\nReceived:');
        console.log(error.received);
        console.log('\nReview:');
        for (const item of error.review) console.log(`- ${item}`);
        console.log('');
      } else {
        console.log(`Unexpected validator error: ${error.code ?? error.message}\n`);
      }
    }
  }
  return passed;
}

let passed = 0;
try {
  passed = await main();
} catch (error) {
  console.error('\nThe application failed to start:', error.message);
  console.error('Review: does .env define DATABASE_URL and JWT_SECRET?');
  console.error('Recovery guide: recovery/environment.md');
} finally {
  await cleanup();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
}

console.log(`\nFINAL RESULT: ${passed === 12 ? 'PASSED' : `FAILED (${passed}/12)`}`);
process.exit(passed === 12 ? 0 : 1);
