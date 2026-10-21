// Class 05 validator — black-box executable specification.
//
// Usage:
//   npm run validate:class-05                      -> full boss battle (12 checks)
//   npm run validate:class-05 -- --stage register  -> one station
//
// Stages: setup · access-design · register · password · login ·
//         authentication · ownership · authorization
//
// Principles:
//   * behaviour is probed over HTTP; internal names and style are free;
//   * PostgreSQL is inspected ONLY to: verify no plain password is stored,
//     promote one synthetic user to agent, check relations, and clean up;
//   * every synthetic identifier starts with "validation-<ts>-<rand>";
//   * cleanup runs in `finally`: history -> requests -> users. Never DROP,
//     never TRUNCATE, never touch rows this run did not create;
//   * it NEVER prints DATABASE_URL, JWT_SECRET, passwords, full tokens or
//     hashes.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = `validation-${Date.now()}-${randomBytes(3).toString('hex')}`;

// ---------------------------------------------------------------- plumbing

class CheckFailure extends Error {
  constructor(expected, observed, review = []) {
    super(expected);
    this.expected = expected;
    this.observed = observed;
    this.review = review;
  }
}

function fail(expected, observed, review = []) {
  throw new CheckFailure(expected, observed, review);
}

let pool = null;
async function db() {
  if (!pool) {
    ({ pool } = await import('../src/database/pool.js'));
  }
  return pool;
}

let server = null;
let baseUrl = process.env.VALIDATION_BASE_URL ?? null;

async function startServer() {
  if (baseUrl) return; // an already-running server was provided
  const { default: app } = await import('../src/app.js');
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

const transcript = []; // every response body, scanned later for leaks

async function api(method, pathName, { token, body, headers: extraHeaders } = {}) {
  const headers = { ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${baseUrl}${pathName}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    fail(
      `The API at ${baseUrl} answers ${method} ${pathName}.`,
      `The connection failed (${error.cause?.code ?? error.message}).`,
      ['Is the server able to start?', 'VALIDATION_BASE_URL, if set, must point at a running server.']
    );
  }
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  transcript.push({ method, path: pathName, status: response.status, text });
  return { status: response.status, body: json, text };
}

function errorCode(res) {
  return res.body?.error?.code ?? '(no error.code)';
}

function expectStatus(res, expected, what, review = []) {
  if (res.status !== expected) {
    fail(
      `${what} answers ${expected}.`,
      `It answered ${res.status} (code: ${errorCode(res)}).`,
      review
    );
  }
}

function expectErrorCode(res, code, what, review = []) {
  if (errorCode(res) !== code) {
    fail(
      `${what} uses error code ${code}.`,
      `It used ${errorCode(res)} (status ${res.status}).`,
      review
    );
  }
}

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

// ------------------------------------------------------------ shared state

const ctx = {}; // alice, bob, agent, requests created along the way

let userCounter = 0;
function syntheticIdentity(name) {
  userCounter += 1;
  return {
    name,
    email: `${TAG}-${name}-${userCounter}@validation.local`,
    password: `${TAG} passphrase for ${name}`
  };
}

async function registerUser(name) {
  const identity = syntheticIdentity(name);
  const res = await api('POST', '/auth/register', {
    body: { email: identity.email, password: identity.password }
  });
  expectStatus(res, 201, 'POST /auth/register with a valid body',
    ['The register contract.', 'Password rules: 15-128 characters, spaces allowed.']);
  identity.id = res.body?.id;
  identity.registerBody = res.body;
  return identity;
}

async function loginUser(identity) {
  const res = await api('POST', '/auth/login', {
    body: { email: identity.email, password: identity.password }
  });
  expectStatus(res, 200, 'POST /auth/login with valid credentials', ['The login contract.']);
  identity.token = res.body?.accessToken;
  identity.loginBody = res.body;
  if (typeof identity.token !== 'string' || identity.token.length === 0) {
    fail('The login response carries a non-empty accessToken.',
      'accessToken is missing or empty.', ['The login response shape.']);
  }
  return identity;
}

async function ensureAlice() {
  if (!ctx.alice) ctx.alice = await loginUser(await registerUser('alice'));
  return ctx.alice;
}

async function ensureBob() {
  if (!ctx.bob) ctx.bob = await loginUser(await registerUser('bob'));
  return ctx.bob;
}

async function ensureAgent() {
  if (!ctx.agent) {
    const identity = await registerUser('agent');
    // Teacher-controlled promotion: the API must never offer this. The
    // validator touches ONLY the synthetic user it just created.
    const client = await db();
    await client.query('UPDATE users SET role = $1 WHERE email = $2', ['agent', identity.email]);
    ctx.agent = await loginUser(identity);
  }
  return ctx.agent;
}

async function createRequestAs(identity, title, extra = {}) {
  const res = await api('POST', '/requests', {
    token: identity.token,
    body: { title: `${TAG} ${title}`, ...extra }
  });
  expectStatus(res, 201, 'POST /requests by a requester with a valid body',
    ['The create contract.', 'createdBy must come from the token, not the body.']);
  return res.body;
}

async function tableColumns(table) {
  const client = await db();
  const result = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Map(result.rows.map((row) => [row.column_name, row.data_type]));
}

// ----------------------------------------------------------------- checks

async function checkDatabaseAndMigrations() {
  const client = await db();
  try {
    await client.query('SELECT 1');
  } catch (error) {
    fail('The database accepts connections.',
      `The connection failed (${error.code ?? 'error'}).`,
      ['DATABASE_URL in .env.', 'npm run db:check.']);
  }

  const requests = await tableColumns('requests');
  const history = await tableColumns('request_status_history');
  if (!requests.size || !history.size) {
    fail('The class 4 schema (requests, request_status_history) exists.',
      'One of the tables is missing.',
      ['Migrations 001 and 002.']);
  }

  const users = await tableColumns('users');
  if (!users.size) {
    fail('Migration 003 created the users table.',
      'The users table does not exist.',
      ['database/migrations/003_create_users.sql.']);
  }
  for (const column of ['id', 'email', 'password_hash', 'role', 'created_at']) {
    if (!users.has(column)) {
      fail(`The users table has a ${column} column.`,
        `The column ${column} is missing.`,
        ['database/migrations/003_create_users.sql.']);
    }
  }
  if (users.get('id') !== 'uuid') {
    fail('users.id is a UUID generated by the database.',
      `users.id has type ${users.get('id')}.`,
      ['UUID PRIMARY KEY DEFAULT gen_random_uuid().']);
  }
  if (!requests.has('created_by')) {
    fail('Migration 004 added requests.created_by.',
      'The column requests.created_by is missing.',
      ['database/migrations/004_add_request_ownership.sql.']);
  }
  if (!history.has('changed_by')) {
    fail('Migration 005 added request_status_history.changed_by.',
      'The column changed_by is missing.',
      ['database/migrations/005_add_history_actor.sql.']);
  }

  const fks = await client.query(
    `SELECT conname FROM pg_constraint WHERE contype = 'f' AND conrelid IN
       ('requests'::regclass, 'request_status_history'::regclass)`
  );
  const names = fks.rows.map((row) => row.conname).join(' ');
  if (!/created_by/.test(names) || !/changed_by/.test(names)) {
    fail('created_by and changed_by are foreign keys to users(id).',
      'At least one of the foreign keys is missing.',
      ['The FOREIGN KEY ... REFERENCES users(id) clauses in migrations 004 and 005.']);
  }
}

async function checkPublicRegistration() {
  const alice = await ensureAlice();
  const body = alice.registerBody ?? {};

  if (typeof body.id !== 'string' || body.id.length < 10) {
    fail('The register response includes the generated user id.',
      'The id is missing or not a generated identifier.',
      ['The register contract.', 'RETURNING in the users insert.']);
  }
  if (body.role !== 'requester') {
    fail('Every new account is created with role "requester".',
      `The response reported role "${body.role}".`,
      ['The role column default.', 'The register service must not accept a role.']);
  }
  const leakyKeys = Object.keys(body).filter((key) => /pass|hash|salt|secret/i.test(key));
  if (leakyKeys.length) {
    fail('The register response never exposes password material.',
      `The response contains the key(s): ${leakyKeys.join(', ')}.`,
      ['The user mapper: what it exposes and what it deliberately drops.']);
  }

  // Normalization: mixed case + spaces in, canonical email out.
  const mixed = syntheticIdentity('norma');
  const res = await api('POST', '/auth/register', {
    body: { email: `  ${mixed.email.toUpperCase()}  `, password: mixed.password }
  });
  expectStatus(res, 201, 'POST /auth/register with a mixed-case, padded email',
    ['Email normalization: trim + lowercase before storing.']);
  if (res.body?.email !== mixed.email.toLowerCase()) {
    fail('The stored email is trimmed and lowercased.',
      'The email was stored without normalization.',
      ['Normalize in the service, before persistence.']);
  }

  // Duplicate email -> generic 409.
  const duplicate = await api('POST', '/auth/register', {
    body: { email: alice.email, password: `${TAG} another passphrase` }
  });
  expectStatus(duplicate, 409, 'Registering an email that already exists',
    ['Duplicates are a conflict, not a validation error.']);
  expectErrorCode(duplicate, 'ACCOUNT_CANNOT_BE_CREATED',
    'The duplicate-email response',
    ['A generic code: the response must not confirm the email is taken.']);

  // Contract basics.
  const empty = await api('POST', '/auth/register', { body: {} });
  expectStatus(empty, 400, 'POST /auth/register with an empty body',
    ['Email and password are required.']);
  const short = await api('POST', '/auth/register', {
    body: { email: syntheticIdentity('short').email, password: 'tiny' }
  });
  expectStatus(short, 400, 'POST /auth/register with a 4-character password',
    ['The workshop minimum is 15 characters.']);
}

async function checkRoleEscalation() {
  for (const [field, value] of [
    ['role', 'agent'],
    ['id', '00000000-0000-0000-0000-000000000000'],
    ['passwordHash', 'scrypt$fake'],
    ['createdAt', '2099-01-01T00:00:00.000Z'],
    ['createdBy', 'someone-else']
  ]) {
    const identity = syntheticIdentity('escalation');
    const res = await api('POST', '/auth/register', {
      body: { email: identity.email, password: identity.password, [field]: value }
    });
    expectStatus(res, 400, `POST /auth/register sending the server-controlled field "${field}"`,
      ['Server-controlled fields are rejected explicitly, never silently ignored.']);
    expectErrorCode(res, 'SERVER_CONTROLLED_FIELD',
      `The response to a body containing "${field}"`,
      ['The register allowlist: only email and password may arrive.']);
  }
}

async function checkPasswordStorage() {
  const alice = await ensureAlice();
  const client = await db();

  const columns = await tableColumns('users');
  if (columns.has('password') || columns.has('plain_password')) {
    fail('The users table stores only a derived hash.',
      'A plain password column exists.',
      ['Migration 003: password_hash, nothing else.']);
  }

  const result = await client.query(
    'SELECT password_hash FROM users WHERE email = $1',
    [alice.email]
  );
  const stored = result.rows[0]?.password_hash ?? '';
  if (!stored) {
    fail('Registration stores a password hash for the new user.',
      'The stored value is empty.',
      ['Where hashPassword is invoked.', 'What the insert persists.']);
  }
  if (stored === alice.password || stored.includes(alice.password)) {
    fail('The stored value is a derived hash, not the password.',
      'The plain password (or a value containing it) was stored.',
      ['hashPassword must run BEFORE persistence.', 'Never store what the user typed.']);
  }
  if (stored.length < 40) {
    fail('The stored value looks like salt + derived key.',
      'The stored value is too short to be a real derived hash.',
      ['The helper output format: scrypt$version$parameters$salt$derivedKey.']);
  }

  // Correct and incorrect password behave differently — and generically.
  const good = await api('POST', '/auth/login', {
    body: { email: alice.email, password: alice.password }
  });
  expectStatus(good, 200, 'Login with the correct password', ['verifyPassword usage.']);
  const bad = await api('POST', '/auth/login', {
    body: { email: alice.email, password: `${alice.password} wrong` }
  });
  expectStatus(bad, 401, 'Login with an incorrect password', ['verifyPassword usage.']);

  // The hash must never travel in any response seen so far.
  const prefix = stored.slice(0, 24);
  if (transcript.some((entry) => entry.text.includes(prefix))) {
    fail('No response ever contains the stored hash.',
      'A response body contained the stored hash.',
      ['The user mapper.', 'Error responses.']);
  }
}

async function checkLoginContract() {
  const alice = await ensureAlice();

  const res = await api('POST', '/auth/login', {
    body: { email: alice.email, password: alice.password }
  });
  expectStatus(res, 200, 'POST /auth/login with valid credentials', ['The login contract.']);
  const body = res.body ?? {};
  if (typeof body.accessToken !== 'string' || body.accessToken.split('.').length !== 3) {
    fail('The login response carries a JWT in accessToken.',
      'accessToken is missing or is not a three-segment JWT.',
      ['The login response shape: accessToken, tokenType, expiresIn.']);
  }
  if (body.tokenType !== 'Bearer') {
    fail('tokenType is exactly "Bearer".',
      `tokenType is ${JSON.stringify(body.tokenType)}.`, ['The login response shape.']);
  }
  if (typeof body.expiresIn !== 'number' || body.expiresIn <= 0) {
    fail('expiresIn announces the token lifetime in seconds.',
      'expiresIn is missing or not a positive number.', ['The login response shape.']);
  }

  // Enumeration resistance: wrong password and unknown email answer alike.
  const wrongPassword = await api('POST', '/auth/login', {
    body: { email: alice.email, password: `${TAG} not the password` }
  });
  const unknownEmail = await api('POST', '/auth/login', {
    body: { email: `${TAG}-ghost@validation.local`, password: `${TAG} not the password` }
  });
  expectStatus(wrongPassword, 401, 'Login with a wrong password', []);
  expectStatus(unknownEmail, 401, 'Login with a nonexistent email', []);
  expectErrorCode(wrongPassword, 'INVALID_CREDENTIALS', 'The failed login response', []);
  if (wrongPassword.text !== unknownEmail.text) {
    fail('Wrong password and unknown email produce IDENTICAL responses.',
      'The two failure responses differ, which allows account enumeration.',
      ['One generic INVALID_CREDENTIALS answer for every cause.']);
  }
}

async function checkJwtVerification() {
  const alice = await ensureAlice();
  const [headerSegment, payloadSegment] = alice.token.split('.');
  let header;
  let payload;
  try {
    header = decodeSegment(headerSegment);
    payload = decodeSegment(payloadSegment);
  } catch {
    fail('The access token is a decodable JWT.',
      'The token segments could not be decoded.', ['The token format.']);
  }

  if (header.alg !== 'HS256') {
    fail('The token is signed with the expected algorithm (HS256).',
      `The header declares "${header.alg}".`, ['The signing configuration.']);
  }
  const issuer = process.env.JWT_ISSUER ?? 'backend-course-api';
  const audience = process.env.JWT_AUDIENCE ?? 'backend-course-client';
  const ttl = Number(process.env.JWT_TTL_SECONDS ?? 3600);
  const claims = [
    ['sub', alice.id],
    ['role', 'requester'],
    ['iss', issuer],
    ['aud', audience]
  ];
  for (const [claim, expected] of claims) {
    if (payload[claim] !== expected) {
      fail(`The ${claim} claim carries the expected value.`,
        `The ${claim} claim is ${JSON.stringify(payload[claim])}.`,
        ['The claims: sub, role, iat, exp, iss, aud.']);
    }
  }
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
    || Math.abs((payload.exp - payload.iat) - ttl) > 5) {
    fail(`The token expires ${ttl} seconds after being issued.`,
      'iat/exp are missing or the lifetime differs from the configuration.',
      ['setIssuedAt and setExpirationTime.', 'JWT_TTL_SECONDS.']);
  }
  const sensitiveClaims = Object.keys(payload).filter((key) => /pass|hash|salt|secret/i.test(key));
  if (sensitiveClaims.length) {
    fail('The payload carries no sensitive material (it is readable by anyone).',
      `The payload contains: ${sensitiveClaims.join(', ')}.`,
      ['A JWT is signed, not encrypted.']);
  }

  // A tampered payload must be worthless: decoding is not verifying.
  const tamperedPayload = encodeSegment({ ...payload, role: 'agent' });
  const tampered = `${headerSegment}.${tamperedPayload}.${alice.token.split('.')[2]}`;
  const tamperedRes = await api('GET', '/auth/me', { token: tampered });
  expectStatus(tamperedRes, 401, 'GET /auth/me with a token whose payload was edited',
    ['Verify the signature; never trust a merely decoded payload.']);

  // An expired token signed with the real secret must also fail.
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '');
  const now = Math.floor(Date.now() / 1000);
  const expired = await new SignJWT({ role: 'requester' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(alice.id).setIssuedAt(now - 7200).setExpirationTime(now - 3600)
    .setIssuer(issuer).setAudience(audience).sign(secret);
  const expiredRes = await api('GET', '/auth/me', { token: expired });
  expectStatus(expiredRes, 401, 'GET /auth/me with an expired token',
    ['exp must be enforced on every verification.']);

  // A token signed with a different secret must fail even if fresh.
  const forged = await new SignJWT({ role: 'agent' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(alice.id).setIssuedAt().setExpirationTime('1h')
    .setIssuer(issuer).setAudience(audience)
    .sign(new TextEncoder().encode(`${TAG}-not-the-real-secret`));
  const forgedRes = await api('GET', '/auth/me', { token: forged });
  expectStatus(forgedRes, 401, 'GET /auth/me with a token signed by another key',
    ['The signature check is what makes the claims trustworthy.']);
}

async function checkProtectedEndpoints() {
  const alice = await ensureAlice();

  for (const [method, pathName] of [
    ['GET', '/auth/me'],
    ['GET', '/requests'],
    ['GET', '/requests/1'],
    ['GET', '/requests/1/history'],
    ['POST', '/requests'],
    ['PATCH', '/requests/1']
  ]) {
    const res = await api(method, pathName, method === 'GET' ? {} : { body: { title: 'x' } });
    expectStatus(res, 401, `${method} ${pathName} without a token`,
      ['Every requests route and /auth/me require a Bearer token.']);
  }

  const basic = await api('GET', '/auth/me', {
    headers: { Authorization: 'Basic dXNlcjpwYXNz' }
  });
  expectStatus(basic, 401, 'GET /auth/me with a Basic authorization header',
    ['Only the Bearer scheme is a trustworthy identity here.']);

  const emptyBearer = await api('GET', '/auth/me', {
    headers: { Authorization: 'Bearer ' }
  });
  expectStatus(emptyBearer, 401, 'GET /auth/me with an empty Bearer token', []);

  const me = await api('GET', '/auth/me', { token: alice.token });
  expectStatus(me, 200, 'GET /auth/me with a valid token', []);
  if (me.body?.id !== alice.id || me.body?.role !== 'requester') {
    fail('/auth/me reports the identity carried by the token.',
      'The reported id or role does not match the authenticated user.',
      ['req.auth: built from the verified payload, used everywhere.']);
  }
}

async function checkTrustedOwnership() {
  const alice = await ensureAlice();
  const bob = await ensureBob();

  const forgedOwner = await api('POST', '/requests', {
    token: alice.token,
    body: { title: `${TAG} forged owner`, createdBy: bob.id }
  });
  expectStatus(forgedOwner, 400, 'POST /requests with createdBy in the body',
    ['createdBy must match the authenticated user.', 'Server-controlled fields.', 'The POST /requests contract.']);
  expectErrorCode(forgedOwner, 'SERVER_CONTROLLED_FIELD',
    'The response to a body containing createdBy', []);

  const bornClosed = await api('POST', '/requests', {
    token: alice.token,
    body: { title: `${TAG} born closed`, status: 'closed' }
  });
  expectStatus(bornClosed, 400, 'POST /requests with status in the body',
    ['A request is born open; status at creation is server-controlled.']);

  const created = await createRequestAs(alice, 'printer failure', {
    description: 'The office printer rejects every job.',
    priority: 'high'
  });
  if (created.createdBy !== alice.id) {
    fail('createdBy is taken from the authenticated identity.',
      'createdBy does not match the user who sent the request.',
      ['The source of trusted identity.', 'Server-controlled fields.', 'The POST /requests contract.']);
  }
  if (created.status !== 'open') {
    fail('A new request is born open.',
      `The new request reported status "${created.status}".`, []);
  }
  ctx.aliceRequest = created;
}

async function checkRequesterIsolation() {
  const alice = await ensureAlice();
  const bob = await ensureBob();
  if (!ctx.aliceRequest) ctx.aliceRequest = await createRequestAs(alice, 'printer failure');
  ctx.bobRequest = await createRequestAs(bob, 'vpn drops');

  // A legacy request from before class 5: no owner, agents only. The
  // validator inserts it directly because the API (correctly) refuses to
  // create ownerless requests.
  const client = await db();
  const legacy = await client.query(
    `INSERT INTO requests (title, priority) VALUES ($1, 'low') RETURNING id`,
    [`${TAG} legacy without owner`]
  );
  ctx.legacyId = Number(legacy.rows[0].id);

  const aliceList = await api('GET', '/requests', { token: alice.token });
  expectStatus(aliceList, 200, 'GET /requests as a requester', []);
  const rows = Array.isArray(aliceList.body) ? aliceList.body : [];
  if (!rows.some((row) => row.id === ctx.aliceRequest.id)) {
    fail('A requester sees their own requests.',
      'The collection is missing a request the user created.', ['The list scope.']);
  }
  const foreign = rows.filter((row) => row.createdBy !== alice.id);
  if (foreign.length) {
    fail('A requester sees ONLY their own requests.',
      'The collection contains requests owned by someone else (or by nobody).',
      ['Scope the collection in SQL with created_by.', 'Legacy rows belong to agents only.']);
  }

  const cross = await api('GET', `/requests/${ctx.bobRequest.id}`, { token: alice.token });
  expectStatus(cross, 404, "GET on another user's request",
    ['A foreign resource must not reveal its existence: same 404 as a missing one.']);
  const missing = await api('GET', '/requests/999999999', { token: alice.token });
  if (cross.status !== missing.status || errorCode(cross) !== errorCode(missing)) {
    fail('A foreign request and a missing request answer identically.',
      'The two responses differ, which reveals that the foreign request exists.',
      ['404 with the same code for both cases.']);
  }

  const crossHistory = await api('GET', `/requests/${ctx.bobRequest.id}/history`, { token: alice.token });
  expectStatus(crossHistory, 404, "GET on another user's request history",
    ['History is as private as the request itself.']);

  const legacyView = await api('GET', `/requests/${ctx.legacyId}`, { token: alice.token });
  expectStatus(legacyView, 404, 'GET on a legacy ownerless request as a requester',
    ['created_by IS NULL never matches a requester.']);
}

async function checkAgentPermissions() {
  const alice = await ensureAlice();
  const agent = await ensureAgent();
  if (!ctx.aliceRequest) ctx.aliceRequest = await createRequestAs(alice, 'printer failure');
  const requestId = ctx.aliceRequest.id;

  const list = await api('GET', '/requests', { token: agent.token });
  expectStatus(list, 200, 'GET /requests as an agent', []);
  const listRows = Array.isArray(list.body) ? list.body : [];
  if (!listRows.some((row) => row.id === requestId)) {
    fail('An agent sees the whole collection.',
      "The agent's collection is missing another user's request.", ['The list scope for agents.']);
  }
  if (ctx.legacyId && !listRows.some((row) => row.id === ctx.legacyId)) {
    fail('An agent sees legacy ownerless requests.',
      'The legacy request is missing from the agent collection.',
      ['Legacy rows (created_by IS NULL) are agent-only, not invisible.']);
  }

  // Requester attempts what only agents may do.
  const priorityDenied = await api('PATCH', `/requests/${requestId}`, {
    token: alice.token, body: { priority: 'low' }
  });
  expectStatus(priorityDenied, 403, 'PATCH priority by a requester on their own request',
    ['403: identified actor, forbidden operation.', 'canChangePriority.']);
  const statusDenied = await api('PATCH', `/requests/${requestId}`, {
    token: alice.token, body: { status: 'in_progress' }
  });
  expectStatus(statusDenied, 403, 'PATCH status by a requester on their own request',
    ['canChangeStatus.']);

  // Mixed body: allowed + forbidden fields -> rejected whole.
  const mixed = await api('PATCH', `/requests/${requestId}`, {
    token: alice.token, body: { title: `${TAG} sneaky`, priority: 'low' }
  });
  expectStatus(mixed, 403, 'PATCH mixing an allowed field with a forbidden one',
    ['All-or-nothing authorization: no unexpected partial updates.']);
  const afterMixed = await api('GET', `/requests/${requestId}`, { token: alice.token });
  if (afterMixed.body?.title === `${TAG} sneaky`) {
    fail('A rejected mixed body changes nothing.',
      'The allowed part of a rejected body was applied anyway.',
      ['Authorize the whole change before writing any of it.']);
  }

  // Requester edits own open content.
  const contentEdit = await api('PATCH', `/requests/${requestId}`, {
    token: alice.token,
    body: { title: `${TAG} printer failure (rebooted, still failing)` }
  });
  expectStatus(contentEdit, 200, 'PATCH title by the owner while the request is open',
    ['canEditContent: owner + open.']);

  // Agent cannot edit content, but changes priority and status.
  const agentContent = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { description: 'agent note' }
  });
  expectStatus(agentContent, 403, 'PATCH content by an agent',
    ['The matrix: content belongs to the owner, workflow belongs to the agent.']);
  const agentPriority = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { priority: 'medium' }
  });
  expectStatus(agentPriority, 200, 'PATCH priority by an agent', []);
  const agentStatus = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { status: 'in_progress' }
  });
  expectStatus(agentStatus, 200, 'PATCH a valid transition by an agent', []);

  // Once no longer open, the owner cannot edit content either.
  const lateEdit = await api('PATCH', `/requests/${requestId}`, {
    token: alice.token, body: { title: `${TAG} too late` }
  });
  expectStatus(lateEdit, 403, 'PATCH content by the owner once the request left open',
    ['canEditContent requires status open.']);
}

async function checkStatusRules() {
  const bob = await ensureBob();
  const agent = await ensureAgent();
  if (!ctx.bobRequest) ctx.bobRequest = await createRequestAs(bob, 'vpn drops');
  const requestId = ctx.bobRequest.id;

  // The state machine from class 3 still binds agents.
  const jump = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { status: 'closed' }
  });
  expectStatus(jump, 409, 'PATCH open -> closed by an agent',
    ['Roles never bypass the state machine.']);
  expectErrorCode(jump, 'INVALID_STATUS_TRANSITION', 'The invalid-transition response', []);

  // changedBy must not be accepted from the body.
  const forgedActor = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { status: 'in_progress', changedBy: bob.id }
  });
  expectStatus(forgedActor, 400, 'PATCH with changedBy in the body',
    ['The history actor comes from the token, never from the body.']);

  // Walk to a terminal state, recording actors.
  for (const status of ['in_progress', 'resolved', 'closed']) {
    const step = await api('PATCH', `/requests/${requestId}`, {
      token: agent.token, body: { status }
    });
    expectStatus(step, 200, `PATCH a valid transition to ${status}`, []);
  }
  const afterTerminal = await api('PATCH', `/requests/${requestId}`, {
    token: agent.token, body: { priority: 'high' }
  });
  expectStatus(afterTerminal, 409, 'PATCH on a closed request',
    ['Terminal states stay immutable — for every role.']);
  expectErrorCode(afterTerminal, 'REQUEST_IN_TERMINAL_STATUS', 'The terminal-state response', []);

  const history = await api('GET', `/requests/${requestId}/history`, { token: agent.token });
  expectStatus(history, 200, 'GET history as an agent', []);
  const entries = Array.isArray(history.body) ? history.body : [];
  const transitions = entries.filter((entry) => entry.previousStatus !== null);
  if (transitions.length < 3) {
    fail('Every transition leaves a history entry.',
      `The history records ${transitions.length} transitions after 3 changes.`, []);
  }
  if (!transitions.every((entry) => entry.changedBy === agent.id)) {
    fail('Every new transition records WHO produced it (changedBy).',
      'At least one transition is missing the acting agent in changedBy.',
      ['Migration 005.', 'insertStatusHistory must receive the actor.']);
  }
}

async function checkSensitiveData() {
  const alice = await ensureAlice();
  // One more sweep of everything the API said during this run.
  const patterns = [
    [/scrypt\$/u, 'a stored password hash'],
    [/postgresql:\/\//u, 'a database connection string'],
    [/\n\s+at .+\d+:\d+/u, 'a stack trace'],
    [/"stack"\s*:/u, 'a serialized stack'],
    [/password_hash/u, 'the password_hash column']
  ];
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) patterns.push([new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'), 'the JWT secret']);
  for (const identity of [ctx.alice, ctx.bob, ctx.agent]) {
    if (identity?.password) {
      patterns.push([new RegExp(identity.password.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'), 'a plain password']);
    }
  }

  for (const entry of transcript) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(entry.text)) {
        fail(`No response ever leaks ${label}.`,
          `${entry.method} ${entry.path} (status ${entry.status}) leaked ${label}.`,
          ['Mappers decide what leaves the API.', 'Error responses: generic outside, detailed in the server log.']);
      }
    }
  }

  const me = await api('GET', '/auth/me', { token: alice.token });
  const keys = Object.keys(me.body ?? {}).filter((key) => /pass|hash|salt|secret/i.test(key));
  if (keys.length) {
    fail('/auth/me exposes id, email and role — nothing else.',
      `The response contains: ${keys.join(', ')}.`, ['The user mapper.']);
  }
}

// ------------------------------------------------- file-only stage checks

async function checkFileStage(file, requirements) {
  const filePath = path.join(ROOT, 'activities', 'class-05', file);
  if (!existsSync(filePath)) {
    fail(`activities/class-05/${file} exists.`, 'The file is missing.',
      ['Station 1 asks you to design access BEFORE implementing (and before using AI).']);
  }
  const content = await readFile(filePath, 'utf8');
  for (const [test, expected, observed, review] of requirements) {
    if (!test(content)) fail(expected, observed, review);
  }
}

// A table row is any |-line that is not the |---|---| separator.
function tableRows(content) {
  return content.split('\n')
    .filter((line) => /^\s*\|/.test(line) && !/^\s*\|[\s\-:|]*\|?\s*$/.test(line));
}

// Only the template's own fill-in marks count as pending. Prose characters
// (quotes, TODO in a sentence, «guillemets») are the student's business.
const PENDING = /___|\?\?\?/;

const designStage = [
  ['access-matrix.md completed', () => checkFileStage('access-matrix.md', [
    [(c) => tableRows(c).length >= 11,
      'access-matrix.md contains the full operation × role table.',
      'The matrix table is missing rows.',
      ['Keep every operation row from the template — one per operation.']],
    [(c) => !PENDING.test(c),
      'Every cell of the matrix is decided (no ___ left).',
      'The file still contains ___ (or ???) fill-in marks.',
      ['Replace each ___ with one of: Sí · No · Propias · Propia · Propia y abierta.']]
  ])],
  ['auth-contract.md completed', () => checkFileStage('auth-contract.md', [
    [(c) => /\/auth\/register/.test(c) && /\/auth\/login/.test(c) && /\/auth\/me/.test(c),
      'auth-contract.md documents the three auth endpoints.',
      'At least one auth endpoint is not documented.',
      ['POST /auth/register, POST /auth/login, GET /auth/me.']],
    [(c) => !PENDING.test(c),
      'Every ___ field of the contract is filled in.',
      'The file still contains ___ (or ???) fill-in marks.',
      ['Each ficha: access, allowed body, success response, error rows, semantics table.']],
    [(c) => /201/.test(c) && /accessToken/.test(c) && /expiresIn/.test(c),
      'auth-contract.md documents the success responses (201, accessToken, expiresIn).',
      'The success responses are not written out yet.',
      ['What exactly does each endpoint answer on success?']],
    [(c) => /401/.test(c) && /403/.test(c) && /404/.test(c) && /INVALID_CREDENTIALS/.test(c),
      'auth-contract.md states when to answer 401, 403 and 404, and the login error code.',
      'The error semantics section looks incomplete.',
      ['401: no identity. 403: identified, forbidden. 404: not found or not revealed.',
        'One generic INVALID_CREDENTIALS for every login failure.']]
  ])],
  ['threat-cases.md completed', () => checkFileStage('threat-cases.md', [
    [(c) => c.split('\n')
        .filter((line) => /^\s*\d+\./.test(line) && line.replace(/^\s*\d+\./, '').trim().length >= 15)
        .length >= 8,
      'threat-cases.md describes at least 8 written-out attacks (numbered cases).',
      'Fewer than 8 numbered cases have real content.',
      ['Each case: what the attacker sends → exact HTTP status + error.code.',
        'At least: role escalation, forged createdBy, foreign ID access, tampered token, mixed PATCH body.']],
    [(c) => !PENDING.test(c),
      'Every case is written out (no ___ left).',
      'The file still contains ___ (or ???) fill-in marks.', []]
  ])]
];

// ---------------------------------------------------------------- runner

const INTEGRAL_CHECKS = [
  ['Database and migrations', checkDatabaseAndMigrations],
  ['Public registration', checkPublicRegistration],
  ['Role escalation protection', checkRoleEscalation],
  ['Password storage', checkPasswordStorage],
  ['Login contract', checkLoginContract],
  ['JWT verification', checkJwtVerification],
  ['Protected endpoints', checkProtectedEndpoints],
  ['Trusted request ownership', checkTrustedOwnership],
  ['Requester isolation', checkRequesterIsolation],
  ['Agent permissions', checkAgentPermissions],
  ['Status rules preserved', checkStatusRules],
  ['Sensitive data protection', checkSensitiveData]
];

const STAGES = {
  register: [
    ['Public registration', checkPublicRegistration],
    ['Role escalation protection', checkRoleEscalation]
  ],
  password: [
    ['Password storage', checkPasswordStorage]
  ],
  login: [
    ['Login contract', checkLoginContract],
    ['JWT claims and lifetime', checkJwtVerification]
  ],
  authentication: [
    ['Protected endpoints', checkProtectedEndpoints],
    ['Token verification', checkJwtVerification]
  ],
  ownership: [
    ['Trusted request ownership', checkTrustedOwnership],
    ['Requester isolation', checkRequesterIsolation]
  ],
  authorization: [
    ['Agent permissions', checkAgentPermissions],
    ['Status rules preserved', checkStatusRules]
  ]
};

async function runSetupStage() {
  const lines = [
    ['Database connection', async () => {
      const client = await db();
      await client.query('SELECT 1');
    }],
    ['Previous schema', async () => {
      const requests = await tableColumns('requests');
      const history = await tableColumns('request_status_history');
      if (!requests.has('status') || !history.has('new_status')) {
        fail('The class 4 tables exist (requests, request_status_history).',
          'At least one class 4 table or column is missing.',
          ['Migrations 001 and 002.']);
      }
    }],
    ['Authentication migrations', async () => {
      const users = await tableColumns('users');
      const requests = await tableColumns('requests');
      const history = await tableColumns('request_status_history');
      if (!users.size || !requests.has('created_by') || !history.has('changed_by')) {
        fail('Migrations 003, 004 and 005 are applied.',
          'At least one authentication migration is missing.',
          ['Run them in order in the SQL editor: 003, 004, 005.']);
      }
    }],
    ['Existing request endpoints', async () => {
      const res = await api('GET', '/requests');
      if (res.status !== 200 && res.status !== 401) {
        fail('GET /requests answers (200 while open, 401 once protected).',
          `It answered ${res.status}.`,
          ['The class 4 API must still start and route.']);
      }
    }],
    ['No committed secrets', async () => {
      const examplePath = path.join(ROOT, '.env.example');
      const ignorePath = path.join(ROOT, '.gitignore');
      if (!existsSync(examplePath) || !existsSync(ignorePath)) {
        fail('.env.example and .gitignore exist.', 'One of them is missing.', []);
      }
      const example = await readFile(examplePath, 'utf8');
      const ignore = await readFile(ignorePath, 'utf8');
      if (!/^\.env$/m.test(ignore) && !ignore.includes('.env')) {
        fail('.gitignore keeps .env out of the repository.',
          '.gitignore does not cover .env.', []);
      }
      const jwtLine = example.split('\n').find((line) => line.startsWith('JWT_SECRET='));
      if (jwtLine && !/replace|placeholder|your/i.test(jwtLine)) {
        fail('.env.example contains only placeholders.',
          'JWT_SECRET in .env.example does not look like a placeholder.',
          ['Real secrets live only in your local .env.']);
      }
      if (/postgresql:\/\/(?!USER:PASSWORD)/.test(example)) {
        fail('.env.example contains only placeholder credentials.',
          'DATABASE_URL in .env.example looks like a real connection string.',
          ['Use postgresql://USER:PASSWORD@HOST:5432/postgres as the placeholder.']);
      }
    }]
  ];

  console.log('CLASS 05 VALIDATION — stage: setup\n');
  let passed = 0;
  for (const [name, run] of lines) {
    try {
      await run();
      console.log(`✓ ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`✗ ${name}`);
      printFailure(error);
    }
  }
  console.log(`\nRESULT: ${passed}/${lines.length}`);
  return passed === lines.length;
}

function printFailure(error) {
  if (error instanceof CheckFailure) {
    console.log('Expected:');
    console.log(error.expected);
    console.log('Observed:');
    console.log(error.observed);
    if (error.review.length) {
      console.log('Review:');
      for (const item of error.review) console.log(`- ${item}`);
    }
  } else {
    console.log('Unexpected validator error:');
    console.log(error.message);
  }
  console.log('');
}

function checkLine(index, total, name, verdict) {
  const label = `[${String(index).padStart(2, '0')}/${String(total).padStart(2, '0')}] ${name} `;
  return `${label}${'.'.repeat(Math.max(2, 42 - label.length))} ${verdict}`;
}

async function runChecks(title, checks) {
  console.log(`${title}\n`);
  let passed = 0;
  for (let i = 0; i < checks.length; i += 1) {
    const [name, run] = checks[i];
    try {
      await run();
      console.log(checkLine(i + 1, checks.length, name, 'PASS'));
      passed += 1;
    } catch (error) {
      console.log(checkLine(i + 1, checks.length, name, 'FAIL'));
      printFailure(error);
    }
  }
  console.log(`\nRESULT: ${passed}/${checks.length}`);
  return passed === checks.length;
}

async function cleanup() {
  // Even a stage that only spoke HTTP may have created synthetic users.
  if (!pool && userCounter === 0) return;
  try {
    await db();
    // Only rows created by THIS run: everything is tagged with TAG.
    const titleTag = `${TAG}%`;
    const emailTag = `${TAG}-%`;
    await pool.query(
      `DELETE FROM request_status_history
       WHERE request_id IN (SELECT id FROM requests WHERE title LIKE $1)
          OR changed_by IN (SELECT id FROM users WHERE email LIKE $2)`,
      [titleTag, emailTag]
    );
    await pool.query(
      `DELETE FROM requests
       WHERE title LIKE $1
          OR created_by IN (SELECT id FROM users WHERE email LIKE $2)`,
      [titleTag, emailTag]
    );
    await pool.query('DELETE FROM users WHERE email LIKE $1', [emailTag]);
  } catch (error) {
    console.error('Cleanup warning:', error.code ?? error.message);
  }
}

async function main() {
  const stageIndex = process.argv.indexOf('--stage');
  const stage = stageIndex === -1 ? null : process.argv[stageIndex + 1];

  if (stage === 'access-design') {
    const ok = await runChecks('CLASS 05 VALIDATION — stage: access-design', designStage);
    if (ok) {
      console.log('\nCheckpoint class-05-access-design reached.');
      console.log('Your access design is on record — AI assistance is now allowed.');
    }
    return ok;
  }

  try {
    await startServer();
  } catch (error) {
    console.log('CLASS 05 VALIDATION\n');
    console.log('The application failed to start:');
    console.log(error.message);
    console.log('\nReview:');
    console.log('- Does .env define DATABASE_URL and JWT_SECRET?');
    console.log('- Does src/app.js import without throwing?');
    return false;
  }

  try {
    if (stage === 'setup') return await runSetupStage();
    if (stage) {
      const checks = STAGES[stage];
      if (!checks) {
        console.log(`Unknown stage "${stage}". Stages: setup, access-design, ${Object.keys(STAGES).join(', ')}.`);
        return false;
      }
      return await runChecks(`CLASS 05 VALIDATION — stage: ${stage}`, checks);
    }

    const ok = await runChecks('CLASS 05 VALIDATION', INTEGRAL_CHECKS);
    if (ok) console.log('CLASS 05 COMPLETED');
    return ok;
  } finally {
    await cleanup();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
