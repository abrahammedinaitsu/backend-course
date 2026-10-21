// Aquí viven las estaciones 2, 3 y 4.
//
// Contratos a cumplir (ver docs/http-contract.md y tu auth-contract.md):
//
//   register(body) -> { id, email, role: 'requester', createdAt }
//     * allowlist: solo email y password pueden llegar. Cualquier campo controlado por el
//       servidor en el body (role, id, createdAt, updatedAt, createdBy, passwordHash)
//       -> 400 SERVER_CONTROLLED_FIELD. Se rechaza EXPLÍCITAMENTE, nunca se ignora en silencio.
//     * email: requerido, formato básico, normalizar (trim + minúsculas) ANTES de guardar
//       -> 400 INVALID_EMAIL si no.
//     * password: string de 15..128 caracteres (Unicode y espacios permitidos, sin reglas de
//       composición arbitrarias) -> 400 INVALID_PASSWORD si no. NUNCA se registra en logs.
//     * email duplicado -> 409 ACCOUNT_CANNOT_BE_CREATED con mensaje genérico: no confirma que
//       la cuenta exista. (pg lanza error.code '23505' en una violación de único.)
//     * guardar SOLO el hash de hashPassword — jamás la password.
//
//   login(body) -> { accessToken, tokenType: 'Bearer', expiresIn: <segundos> }
//     * TODA falla (email desconocido, password mala, cualquier otra) responde el MISMO
//       401 INVALID_CREDENTIALS con idéntico mensaje: bytes iguales, cero pistas.
//
//   getCurrentUser(actor) -> { id, email, role }
//     * `actor` viene de req.auth. Nunca devolver material de password de ningún tipo.
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

const SERVER_CONTROLLED_FIELDS = [
  'role', 'id', 'createdAt', 'updatedAt', 'createdBy', 'passwordHash'
];

// Formato de email deliberadamente laxo: la verificación real sería un correo de confirmación,
// no una expresión regular perfecta. Solo descarta lo evidentemente inválido.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export async function register(body) {
  // 1. Allowlist: rechazo explícito de campos que el cliente nunca decide.
  for (const field of SERVER_CONTROLLED_FIELDS) {
    if (body?.[field] !== undefined) {
      throw new AppError('contract', 'SERVER_CONTROLLED_FIELD',
        `The field "${field}" is controlled by the server and cannot be sent.`);
    }
  }

  // 2. Email: requerido, con formato, normalizado ANTES de guardar.
  const email = normalizeEmail(body?.email);
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new AppError('contract', 'INVALID_EMAIL', 'A valid email address is required.');
  }

  // 3. Password: longitud por PUNTOS DE CÓDIGO (acepta emojis válidos), sin reglas de composición.
  const password = body?.password;
  if (typeof password !== 'string'
      || [...password].length < PASSWORD_MIN_LENGTH
      || [...password].length > PASSWORD_MAX_LENGTH) {
    throw new AppError('contract', 'INVALID_PASSWORD',
      `The password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`);
  }

  // 4. Hashear ANTES de persistir. Nunca se guarda ni se registra la password.
  const passwordHash = await hashPassword(password);

  try {
    const row = await insertUser({ email, passwordHash });
    return mapUserRow(row);
  } catch (error) {
    // 5. Violación de único (email duplicado): 409 GENÉRICO. No se confirma que la cuenta exista.
    if (error.code === '23505') {
      throw new AppError('domain', 'ACCOUNT_CANNOT_BE_CREATED',
        'The account cannot be created with the supplied information.');
    }
    throw error;
  }
}

export async function login(body) {
  const email = normalizeEmail(body?.email);
  const password = body?.password;

  // Una única salida de falla, la misma para TODAS las causas.
  const invalid = () => new AppError('auth', 'INVALID_CREDENTIALS',
    'Email or password is incorrect.');

  const row = await findByEmail(email);
  if (!row) {
    // Aún así, la respuesta debe tomar el mismo camino y el mismo tiempo aparente.
    throw invalid();
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw invalid();

  const accessToken = await issueToken({ id: row.id, role: row.role });
  return { accessToken, tokenType: 'Bearer', expiresIn: TOKEN_TTL_SECONDS };
}

export async function getCurrentUser(actor) {
  const row = await findById(actor.userId);
  if (!row) {
    // El token era válido pero el usuario ya no existe: la identidad no es confiable.
    throw new AppError('auth', 'INVALID_TOKEN', 'The access token is invalid.');
  }
  const { id, email, role } = mapUserRow(row);
  return { id, email, role };
}
