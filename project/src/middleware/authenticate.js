// Middleware de autenticación: establece QUIÉN es el actor, nada más. Lo que el actor puede
// HACER es autorización y vive en las políticas del módulo.
//
// Contrato:
//   * leer el header Authorization; exigir exactamente el esquema Bearer ("Basic ...", un token
//     pelado o un Bearer vacío no son identidades) -> 401 AUTHENTICATION_REQUIRED;
//   * verificar el token con verifyToken (nunca solo decodificarlo); cualquier fallo
//     (alterado, expirado, emisor/audiencia equivocados) -> 401 INVALID_TOKEN — una misma
//     respuesta que nunca explica qué control falló;
//   * en éxito, construir la ÚNICA fuente de identidad confiable:
//       req.auth = { userId: payload.sub, role: payload.role }
//
// Los errores se responden aquí con respondError (los middleware no llegan al try/catch del router).
import { AppError } from '../app-error.js';
import { respondError } from '../http/respond-error.js';
import { verifyToken } from '../modules/auth/token.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return respondError(res, new AppError('auth', 'AUTHENTICATION_REQUIRED',
      'A Bearer token is required.'));
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    // Un mismo 401 para firma alterada, token expirado o emisor/audiencia equivocados:
    // detallar el fallo le regalaría un mapa de la verificación a quien fabrica tokens.
    return respondError(res, new AppError('auth', 'INVALID_TOKEN', 'The access token is invalid.'));
  }

  // La única identidad confiable: se construye del payload VERIFICADO, no del body.
  req.auth = { userId: payload.sub, role: payload.role };
  next();
}
