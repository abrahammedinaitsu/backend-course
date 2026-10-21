// ============================================================================
// Estado de sesión. Es el ÚNICO lugar que guarda el token y el usuario actual.
//
// DECISIÓN DEL TOKEN (documentada también en el README):
//   el token vive en MEMORIA, no en localStorage ni sessionStorage.
//   * Se pierde al recargar la página. Es una limitación honesta: el usuario
//     vuelve a entrar. A cambio, no hay nada persistido que un XSS pueda
//     cosechar en un descuido posterior.
//   * `localStorage` no es la respuesta universal: es accesible por cualquier
//     script del origen, así que un XSS lo lee. Lo elegiríamos solo si la
//     comodidad de "seguir logueado" valiera ese costo — y aquí no lo vale.
// ============================================================================

import { http, setTokenProvider } from './api.js';

// El estado vive aquí y solo aquí.
let accessToken = null;
let currentUser = null; // { id, email, role }

// El cliente HTTP pide el token a este módulo; nunca lo guarda él.
setTokenProvider(() => accessToken);

export function getToken() {
  return accessToken;
}

export function getUser() {
  return currentUser;
}

export function isAuthenticated() {
  return accessToken !== null && currentUser !== null;
}

/**
 * Registra una cuenta nueva. NO envía `role` ni ningún campo del servidor.
 * @returns {{ok:true, user:object} | {ok:false, status:number, body:any}}
 */
export async function register({ email, password }) {
  const result = await http.post('/auth/register', { email, password }, { auth: false });
  if (result.status !== 201) return { ok: false, status: result.status, body: result.body };
  return { ok: true, user: result.body };
}

/**
 * Inicia sesión: guarda el token y luego confirma la identidad con /auth/me.
 * @returns {{ok:true, user:object} | {ok:false, status:number, body:any}}
 */
export async function login({ email, password }) {
  const result = await http.post('/auth/login', { email, password }, { auth: false });
  if (result.status !== 200) return { ok: false, status: result.status, body: result.body };

  accessToken = result.body.accessToken;

  // Confirmar quién soy (y validar el token recién emitido).
  const me = await http.get('/auth/me');
  if (me.status !== 200) {
    accessToken = null;
    return { ok: false, status: me.status, body: me.body };
  }

  currentUser = {
    // El backend devuelve el id como string (UUID) en /auth/me;
    // en el token el `sub` es el mismo UUID. Guardamos ambos por claridad.
    userId: me.body.id,
    id: me.body.id,
    email: me.body.email,
    role: me.body.role
  };
  return { ok: true, user: currentUser };
}

/**
 * Logout LOCAL: olvida el token en el cliente.
 * OJO: el JWT sigue siendo válido en el servidor hasta que expira — este
 * backend educativo no tiene revocación (es una de las limitaciones anotadas
 * en la reflexión del taller).
 */
export function logout() {
  accessToken = null;
  currentUser = null;
}

/** Revalida la sesión contra el backend (por si expiró). */
export async function refreshUser() {
  if (!accessToken) return null;
  const me = await http.get('/auth/me');
  if (me.status !== 200) {
    logout();
    return null;
  }
  currentUser = { userId: me.body.id, id: me.body.id, email: me.body.email, role: me.body.role };
  return currentUser;
}
