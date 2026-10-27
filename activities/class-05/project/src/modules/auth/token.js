// Emisión y verificación del JWT del taller. La plomería del entorno ya está lista.
//
// Claims que pide el contrato:
//   sub  -> id del usuario        iat -> emitido en
//   role -> requester | agent     exp -> iat + TOKEN_TTL_SECONDS (1 hora)
//   iss  -> backend-course-api    aud -> backend-course-client
//
// Regla de la estación: decodificar deja LEER; VERIFICAR deja CONFIAR. jwtVerify comprueba
// firma, algoritmo, emisor, audiencia y expiración. El token va FIRMADO, no cifrado: el
// payload lo lee cualquiera, así que no lleva nada sensible.
import 'dotenv/config';
import { SignJWT, jwtVerify } from 'jose';

// Fallar temprano: una API que firma tokens con un secreto vacío es peor que una que se niega
// a arrancar.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const ALGORITHM = 'HS256';
const ISSUER = process.env.JWT_ISSUER ?? 'backend-course-api';
const AUDIENCE = process.env.JWT_AUDIENCE ?? 'backend-course-client';

export const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 3600);

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

export async function verifyToken(token) {
  // Verificar — no decodificar. jwtVerify valida firma, algoritmo, emisor, audiencia y exp.
  // Cualquier fallo lanza; el llamador lo traduce a un 401 uniforme.
  const { payload } = await jwtVerify(token, SECRET_KEY, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE
  });
  return payload;
}
