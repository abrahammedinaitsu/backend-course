// ============================================================================
// Cliente HTTP de la entrega 05A. UN solo lugar toca `fetch`.
//
// Reglas que respeta este archivo:
//   * consume el contrato REAL de la API (mismos endpoints, mismos códigos);
//   * no inventa endpoints "para facilitar el frontend";
//   * no manda `createdBy` ni `role` (el servidor los rechazaría con 400);
//   * separa "respuesta del contrato" (status + body) de "no hay backend"
//     (status 0), que es una situación de interfaz distinta.
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// DECISIÓN DOCUMENTADA (ver README): el token vive SOLO en memoria, en el
// módulo de sesión. Se pierde al recargar; es una limitación honesta y reduce
// la superficie de XSS (no hay nada persistido que un script inyectado pueda
// leer en un descuido posterior). Nunca se hardcodea un token.
export { API_URL };

// El token se inyecta desde el módulo de sesión; este cliente no lo guarda.
let tokenProvider = () => null;
export function setTokenProvider(provider) {
  tokenProvider = provider;
}

/**
 * Toda petición pasa por aquí.
 * @returns {Promise<{status:number, body:any, networkError?:string}>}
 *   status 0 => no hubo respuesta HTTP (red caída, backend apagado o CORS).
 */
export async function api(method, path, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? tokenProvider() : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    // No hay respuesta HTTP que interpretar: red caída o CORS mal configurado.
    return { status: 0, body: null, networkError: error?.message ?? 'network' };
  }

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON: se conserva en null */
  }
  return { status: response.status, body: parsed };
}

// Atajos legibles por verbo.
export const http = {
  get: (path, opts) => api('GET', path, undefined, opts),
  post: (path, body, opts) => api('POST', path, body, opts),
  patch: (path, body, opts) => api('PATCH', path, body, opts)
};
