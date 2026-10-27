// Coordination layer for authentication: registration rules, credential
// verification and token emission. No SQL (users.store), no cryptography
// (password.js, token.js), no HTTP status codes (AppError categories).
import { AppError } from '../../app-error.js';
import {
  hashPassword,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH
} from './password.js';
import { issueToken, TOKEN_TTL_SECONDS } from './token.js';
import { findByEmail, findById, insertUser } from '../users/users.store.js';
import { mapUserRow } from '../users/user.mapper.js';

// Fields the server controls. Sending them is rejected explicitly — a
// silently ignored "role": "agent" would teach the client that trying
// costs nothing.
const SERVER_CONTROLLED_FIELDS = ['role', 'id', 'createdAt', 'updatedAt', 'createdBy', 'passwordHash'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The same generic error for every login failure: an attacker must not
// learn whether the email exists.
function invalidCredentials() {
  return new AppError('auth', 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
}

// Verified against when the email does not exist, so both login paths do
// comparable work and timing reveals less. Computed once, lazily.
let fallbackHashPromise = null;
function fallbackHash() {
  fallbackHashPromise ??= hashPassword('workshop-timing-fallback-not-a-real-password');
  return fallbackHashPromise;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function assertValidPassword(password) {
  if (typeof password !== 'string') {
    throw new AppError('contract', 'INVALID_PASSWORD', 'A password is required.');
  }
  // Code points, not UTF-16 units: passphrases may use any alphabet,
  // spaces included. Length is the only rule — no arbitrary symbol quotas.
  const length = [...password].length;
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    throw new AppError('contract', 'INVALID_PASSWORD',
      `The password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`);
  }
}

export async function register(body) {
  const input = body ?? {};

  for (const field of SERVER_CONTROLLED_FIELDS) {
    if (field in input) {
      throw new AppError('contract', 'SERVER_CONTROLLED_FIELD',
        field === 'role'
          ? 'Role is controlled by the server.'
          : `The field "${field}" is controlled by the server.`);
    }
  }

  if (typeof input.email !== 'string' || !EMAIL_PATTERN.test(input.email.trim())) {
    throw new AppError('contract', 'INVALID_EMAIL', 'A valid email is required.');
  }
  assertValidPassword(input.password);

  const email = normalizeEmail(input.email);

  // Generic 409: the response does not confirm that the email is taken.
  const duplicate = () => new AppError('domain', 'ACCOUNT_CANNOT_BE_CREATED',
    'The account cannot be created with the supplied information.');

  if (await findByEmail(email)) {
    throw duplicate();
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const row = await insertUser({ email, passwordHash });
    return mapUserRow(row);
  } catch (error) {
    // 23505 = unique_violation: someone registered the same email between
    // our check and our insert. Same generic answer.
    if (error.code === '23505') throw duplicate();
    throw error;
  }
}

export async function login(body) {
  const { email, password } = body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw invalidCredentials();
  }

  const user = await findByEmail(normalizeEmail(email));
  if (!user) {
    // Do comparable work anyway, then fail with the same generic error.
    await verifyPassword(password, await fallbackHash());
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  return {
    accessToken: await issueToken({ id: user.id, role: user.role }),
    tokenType: 'Bearer',
    expiresIn: TOKEN_TTL_SECONDS
  };
}

export async function getCurrentUser(actor) {
  const row = await findById(actor.userId);
  if (!row) {
    // Valid token for an account that no longer exists: no identity.
    throw new AppError('auth', 'INVALID_TOKEN', 'The token is invalid or has expired.');
  }
  const user = mapUserRow(row);
  return { id: user.id, email: user.email, role: user.role };
}
