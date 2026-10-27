// Final validator for class 09. It verifies four things, in this order:
// the environment works, the system dossier is real (sections, evidence,
// classifications, impact analysis), the BUG-901 authorization contract
// holds, and the boundaries + regression net survived your fix.
//
// Guarantees (same contract as the class 06/07/08 validators):
//   - synthetic, tagged users/requests only; cleanup ALWAYS runs;
//   - never prints secrets; never reveals the solution;
//   - exit code 0 only when every check passes.
//
// Document checks are deliberately transparent text checks: they verify
// that sections exist, cite real files and use the allowed classifications.
// They cannot measure comprehension — that is what the dossier REVIEW and
// the oral verification are for.
import 'dotenv/config';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = `class09-validation-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const createdUserIds = [];
const createdRequestIds = [];

const print = console.log.bind(console);
const discardedLogs = [];
console.log = (entry) => discardedLogs.push(String(entry));
console.error = (entry) => discardedLogs.push(String(entry));

// ------------------------------------------------------------- helpers

function detail(expected, received, review) {
  return { expected, received, review };
}

let app = null;
let pool = null;
let realQuery = null;
let server = null;
let BASE = null;

async function api(method, urlPath, { token, body, headers: extra } = {}) {
  // Check 13 blocks the event loop while the test suite runs; any kept-alive
  // socket dies meanwhile. One connection per request keeps this immune.
  const headers = { connection: 'close', ...(extra ?? {}) };
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
  return { status: response.status, body: json, raw };
}

let userCounter = 0;
async function registerUser(name) {
  userCounter += 1;
  const email = `${TAG}-${name}-${userCounter}@example.test`;
  const password = `frase de validacion para ${name}`;
  const response = await api('POST', '/auth/register', { body: { email, password } });
  if (response.status !== 201) throw new Error(`Could not register a synthetic user (${response.status}).`);
  createdUserIds.push(response.body.id);
  return { id: response.body.id, email, password };
}

async function loginUser(user) {
  const response = await api('POST', '/auth/login', { body: { email: user.email, password: user.password } });
  if (response.status !== 200) throw new Error(`Could not log in (${response.status}).`);
  return response.body.accessToken;
}

async function promoteToAgent(user) {
  await realQuery('UPDATE users SET role = $1 WHERE id = $2', ['agent', user.id]);
}

async function createRequestAs(token, fields = {}) {
  const response = await api('POST', '/requests', {
    token, body: { title: `${TAG} request`, ...fields }
  });
  if (response.status !== 201) throw new Error(`Could not create a synthetic request (${response.status}).`);
  createdRequestIds.push(response.body.id);
  return response.body;
}

function dossier() {
  try {
    return readFileSync(path.join(ROOT, 'activities/class-09/system-dossier.md'), 'utf8');
  } catch {
    return null;
  }
}

function dossierSection(text, number) {
  const match = text.match(new RegExp(`##\\s*${number}\\.[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s*\\d|$)`));
  return match ? match[1] : null;
}

// ------------------------------------------------------------- checks

const failures = [];
let owner, ownerToken, stranger, strangerToken, agent, agentToken, target;

const CHECKS = [
  ['Environment', 'Required environment variables', async () => {
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      return detail('DATABASE_URL and JWT_SECRET present in .env',
        'one of them is missing or empty',
        ['cp .env.example .env and fill it (same values since class 06)',
          'npm run doctor explains every environment failure']);
    }
    return null;
  }],

  ['Environment', 'Database connection', async () => {
    ({ default: app } = await import('../src/app.js'));
    ({ pool } = await import('../src/database/pool.js'));
    realQuery = pool.query.bind(pool);
    try {
      await realQuery('SELECT 1');
    } catch (error) {
      return detail('SELECT 1 against your Supabase database', error.code ?? error.message,
        ['npm run doctor — it explains connection failures and points to recovery/environment.md']);
    }
    server = app.listen(0);
    BASE = `http://127.0.0.1:${server.address().port}`;
    return null;
  }],

  ['System dossier', 'Required sections exist', async () => {
    const text = dossier();
    if (!text) {
      return detail('activities/class-09/system-dossier.md exists', 'file missing',
        ['the dossier is the workshop deliverable — start with the template']);
    }
    const missing = [];
    for (let section = 1; section <= 9; section += 1) {
      if (!dossierSection(text, section)) missing.push(section);
    }
    if (missing.length) {
      return detail('sections ## 1. to ## 9. present', `missing: ${missing.join(', ')}`,
        ['keep the template headings — the review and this validator rely on them']);
    }
    return null;
  }],

  ['System dossier', 'Request trace references real files', async () => {
    const text = dossier();
    const trace = text ? dossierSection(text, 3) : null;
    if (!trace || /\[COMPLETAR/.test(trace)) {
      return detail('section 3 completed (no [COMPLETAR] markers left)',
        trace ? 'placeholders still present' : 'section missing',
        ['trace GET /requests/:id step by step with file and function']);
    }
    const refs = [...new Set(trace.match(/(?:src|test)\/[\w./-]+\.js/g) ?? [])];
    const missing = refs.filter((rel) => !existsSync(path.join(ROOT, rel)));
    if (refs.length < 3) {
      return detail('at least 3 real file references (src/... or test/...) in the trace',
        `${refs.length} reference(s) found`,
        ['each step names its file: router, middleware, service, store, test']);
    }
    if (missing.length) {
      return detail('every referenced file exists in the repository',
        `not found: ${missing.slice(0, 3).join(', ')}`,
        ['evidence must be checkable — fix the paths or remove the claim']);
    }
    return null;
  }],

  ['System dossier', 'Audit uses allowed classifications', async () => {
    const text = dossier();
    const audit = text ? dossierSection(text, 7) : null;
    if (!audit || /\[COMPLETAR/.test(audit)) {
      return detail('section 7 completed for every area',
        audit ? 'placeholders still present' : 'section missing',
        ['classify each area: COMPLIES, PARTIAL, DOES_NOT_COMPLY, NOT_FOUND or NOT_UNDERSTOOD']);
    }
    const used = audit.match(/\b(COMPLIES|PARTIAL|DOES_NOT_COMPLY|NOT_FOUND|NOT_UNDERSTOOD)\b/g) ?? [];
    if (used.length < 10) {
      return detail('at least 10 areas classified with the allowed labels',
        `${used.length} classification(s) found`,
        ['NOT_UNDERSTOOD is a legitimate classification — use it instead of guessing']);
    }
    return null;
  }],

  ['System dossier', 'Change impact completed', async () => {
    const text = dossier();
    const impact = text ? dossierSection(text, 8) : null;
    if (!impact || /\[COMPLETAR/.test(impact)) {
      return detail('section 8 (change impact) completed BEFORE the fix',
        impact ? 'placeholders still present' : 'section missing',
        ['the analysis commit (class-09-analysis) should come before class-09-fix']);
    }
    const required = ['Observable behavior', 'Files likely affected', 'Rule to protect',
      'Status codes', 'Tests to add or change', 'Behavior that must remain unchanged', 'Risks'];
    const missing = required.filter((heading) => !impact.includes(heading));
    if (missing.length) {
      return detail('every impact subsection present', `missing: ${missing.join(', ')}`,
        ['keep the template subheadings']);
    }
    return null;
  }],

  ['Authorization', 'Unauthenticated request returns 401', async () => {
    owner = await registerUser('owner');
    stranger = await registerUser('stranger');
    agent = await registerUser('agent');
    await promoteToAgent(agent);
    ownerToken = await loginUser(owner);
    strangerToken = await loginUser(stranger);
    agentToken = await loginUser(agent);
    target = await createRequestAs(ownerToken, { priority: 'high' });

    const response = await api('GET', `/requests/${target.id}`);
    if (response.status !== 401) {
      return detail('GET /requests/:id without token -> 401', `${response.status}`,
        ['the detail route must stay behind authenticate']);
    }
    return null;
  }],

  ['Authorization', 'Owner requester receives 200', async () => {
    const response = await api('GET', `/requests/${target.id}`, { token: ownerToken });
    if (response.status !== 200 || response.body?.id !== target.id) {
      return detail('owner reads their request -> 200', `${response.status}`,
        ['the fix must not break the authorized path']);
    }
    const keys = Object.keys(response.body).sort().join(',');
    const expected = ['assignedTo', 'createdAt', 'createdBy', 'description', 'id', 'priority', 'status', 'title', 'updatedAt'].join(',');
    if (keys !== expected) {
      return detail('the authorized response keeps its previous schema',
        `keys: ${keys}`,
        ['BUG-901 forbids changing the successful contract — compare with request-detail.test.js']);
    }
    return null;
  }],

  ['Authorization', 'Other requester receives 404', async () => {
    const response = await api('GET', `/requests/${target.id}`, { token: strangerToken });
    if (response.status !== 404 || response.body?.error?.code !== 'REQUEST_NOT_FOUND') {
      return detail('a different requester -> 404 REQUEST_NOT_FOUND (indistinguishable from missing)',
        `${response.status} ${response.body?.error?.code ?? ''}`,
        ['this is BUG-901: reproduce it first, then make the service consult the policy',
          'course decision: 404 for both missing and not-visible, to avoid enumeration']);
    }
    const missing = await api('GET', '/requests/999999999', { token: strangerToken });
    if (missing.status !== 404) {
      return detail('a nonexistent id -> 404', `${missing.status}`,
        ['missing and not-visible must be indistinguishable']);
    }
    return null;
  }],

  ['Authorization', 'Agent receives 200', async () => {
    const response = await api('GET', `/requests/${target.id}`, { token: agentToken });
    if (response.status !== 200 || response.body?.id !== target.id) {
      return detail('an agent reads any request -> 200', `${response.status}`,
        ['the policy allows agents; make sure your fix did not block them']);
    }
    return null;
  }],

  ['Authorization', 'Body/query userId cannot grant access', async () => {
    const byQuery = await api('GET', `/requests/${target.id}?userId=${owner.id}`, { token: strangerToken });
    if (byQuery.status !== 404) {
      return detail('GET /requests/:id?userId=<owner> with a stranger token -> 404',
        `${byQuery.status}`,
        ['the trusted identity comes ONLY from the verified token (req.auth)']);
    }
    const byHeaderish = await api('GET', `/requests/${target.id}?createdBy=${owner.id}&as=${owner.id}`, { token: strangerToken });
    if (byHeaderish.status !== 404) {
      return detail('no query parameter grants ownership', `${byHeaderish.status}`,
        ['the policy must receive the actor from req.auth, never from client input']);
    }
    return null;
  }],

  ['Boundaries and regression', 'Policy has no Express dependency', async () => {
    const source = readFileSync(path.join(ROOT, 'src/modules/requests/request.policy.js'), 'utf8');
    const offenders = [];
    if (/from\s+['"]express['"]|require\(\s*['"]express['"]\s*\)/.test(source)) offenders.push('imports express');
    if (/\breq\s*\.\s*(params|body|headers|query|auth)\b/.test(source)) offenders.push('reads the request object');
    if (/\bres\s*\.\s*(status|json|send)\b/.test(source)) offenders.push('writes the response object');
    if (/database\/pool|pool\s*\.\s*query|\bSELECT\b/i.test(source)) offenders.push('touches the database');
    if (offenders.length) {
      return detail('src/modules/requests/request.policy.js pure (no Express, no SQL)',
        `found: ${offenders.join(', ')}`,
        ['the policy receives plain data and returns a verdict — that is why npm run test:policy needs no .env']);
    }
    return null;
  }],

  ['Boundaries and regression', 'Regression suite passes', async () => {
    try {
      execSync(`node --test --test-concurrency=1 "test/*.test.js"`, {
        cwd: ROOT, stdio: 'pipe', timeout: 240000
      });
      return null;
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      const failing = (output.match(/^not ok.*$/gm) ?? []).slice(0, 3).join(' | ');
      return detail('npm test fully green (including your new regression tests)',
        failing || 'the suite exited with failures',
        ['run npm test and read the first failing test',
          'a fix that breaks a neighbor changed more than the ticket asked']);
    }
  }],

  ['Boundaries and regression', 'No secrets included in submissions', async () => {
    const targets = ['activities/class-09/system-dossier.md', 'activities/class-09/work-log.md',
      'activities/class-09/validation-evidence.txt', 'assessment/conversation-transcript.md',
      'assessment/evaluator-report.md', 'assessment/evaluator-report.json',
      'assessment/assessment-card.json'];
    const patterns = [/postgres(ql)?:\/\/\S+@/i, /JWT_SECRET\s*=\s*\S{8,}/i,
      /Bearer\s+eyJ[A-Za-z0-9._-]{20,}/, /eyJ[A-Za-z0-9._-]{40,}/, /scrypt\$\S+/];
    const dirty = [];
    for (const rel of targets) {
      const full = path.join(ROOT, rel);
      if (!existsSync(full)) continue;
      const content = readFileSync(full, 'utf8');
      if (patterns.some((pattern) => pattern.test(content))) dirty.push(rel);
    }
    if (dirty.length) {
      return detail('no connection strings, secrets or tokens inside the submitted documents',
        `possible secret found in: ${dirty.join(', ')}`,
        ['replace the value with [REDACTED] and, if it was real, rotate it (database password / JWT secret)']);
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
        ['run npm run doctor first', 'run npm test to see which behavior is missing']);
    }
    results.push([section, name, failure]);
    if (failure) failures.push([name, failure]);
    if (failure && section === 'Environment') break; // nothing else can run
  }
} catch (error) {
  crashed = error;
} finally {
  let cleanupOk = true;
  try {
    if (realQuery && createdRequestIds.length) {
      await realQuery('DELETE FROM request_history WHERE request_id = ANY($1::bigint[])', [createdRequestIds]);
      await realQuery('DELETE FROM requests WHERE id = ANY($1::bigint[])', [createdRequestIds]);
    }
    if (realQuery && createdUserIds.length) {
      await realQuery('DELETE FROM request_history WHERE changed_by = ANY($1::uuid[])', [createdUserIds]);
      await realQuery('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  } catch {
    cleanupOk = false;
  }
  if (server) server.close();
  if (pool) await pool.end();

  print('CLASS 09 SYSTEM VALIDATION\n');
  let index = 0;
  let currentSection = null;
  const total = CHECKS.length;
  for (const [section, name, failure] of results) {
    index += 1;
    if (section !== currentSection) {
      if (currentSection !== null) print('');
      print(section);
      currentSection = section;
    }
    const label = `[${String(index).padStart(2, '0')}/${total}] ${name} `;
    print(`${label}${'.'.repeat(Math.max(2, 50 - label.length))} ${failure ? 'FAIL' : 'PASS'}`);
  }
  if (results.length < total) {
    print(`\n(${total - results.length} check(s) skipped: the environment checks must pass first.)`);
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
  print(`\nFINAL RESULT: ${passed === total && !crashed ? 'PASSED' : `FAILED (${passed}/${total})`}`);
  process.exit(passed === total && !crashed ? 0 : 1);
}
