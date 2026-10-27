// Password hashing helper. This module knows cryptography and nothing
// else: no Express, no SQL, no HTTP. It never logs its inputs.
//
// Stored format (versionable, self-describing):
//   scrypt$1$N=16384,r=8,p=1$<salt base64url>$<derived key base64url>
// Verification reads the parameters from the stored value, so old hashes
// keep working if the defaults change later.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const FORMAT_VERSION = 1;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export async function hashPassword(password) {
  // A fresh random salt per password: two equal passwords never share a hash.
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scrypt(password, salt, KEY_BYTES, SCRYPT_PARAMS);
  const params = `N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}`;
  return [
    'scrypt',
    FORMAT_VERSION,
    params,
    salt.toString('base64url'),
    derivedKey.toString('base64url')
  ].join('$');
}

export async function verifyPassword(password, storedHash) {
  // A malformed stored value means "does not match", never a crash.
  const parts = typeof storedHash === 'string' ? storedHash.split('$') : [];
  if (parts.length !== 5 || parts[0] !== 'scrypt') return false;

  const [, , paramsPart, saltPart, keyPart] = parts;
  let salt;
  let expectedKey;
  let params;
  try {
    salt = Buffer.from(saltPart, 'base64url');
    expectedKey = Buffer.from(keyPart, 'base64url');
    params = Object.fromEntries(paramsPart.split(',').map((pair) => {
      const [name, value] = pair.split('=');
      return [name, Number(value)];
    }));
  } catch {
    return false;
  }
  if (!salt.length || !expectedKey.length || !params.N || !params.r || !params.p) return false;

  const derivedKey = await scrypt(password, salt, expectedKey.length, params);
  // Constant-time comparison: the answer takes the same time whether the
  // first byte differs or the last one does.
  return timingSafeEqual(derivedKey, expectedKey);
}
