// Token issuing and verification. This module knows JWTs and nothing
// else: no SQL, no requests, no Express.
import 'dotenv/config';
import { SignJWT, jwtVerify } from 'jose';

// Fail early: an API that signs tokens with an empty secret is worse
// than an API that refuses to start.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const ALGORITHM = 'HS256';
const ISSUER = process.env.JWT_ISSUER ?? 'backend-course-api';
const AUDIENCE = process.env.JWT_AUDIENCE ?? 'backend-course-client';

export const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 3600);

// The payload carries identity and role — nothing sensitive. A JWT is
// signed, not encrypted: anyone holding it can READ these claims.
export async function issueToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(SECRET_KEY);
}

// Decoding lets you read; verifying lets you trust. jwtVerify checks the
// signature, the algorithm, iss, aud and exp — all of them, every time.
export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, SECRET_KEY, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE
  });
  return payload;
}
