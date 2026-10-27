// ============================================================================
// Clasificador de errores para la interfaz. Una sola función traduce
// (status, body) en un mensaje claro y ACCIONABLE.
//
// Requisito de la entrega 05A: cada situación le dice al usuario algo distinto
// porque ES algo distinto. Un único "algo salió mal" para todo NO cumple.
//
// Mapa cubierto, explícito:
//   status 0   -> backend no disponible / red / CORS          (infraestructura)
//   400        -> error de validación (contrato)
//   401        -> sin sesión válida (distingue credenciales de token)
//   403        -> tu rol no permite esta operación
//   404        -> la solicitud no existe (o no es tuya)
//   409        -> conflicto con el estado actual
//   500        -> el servidor tuvo un problema
//   503        -> la base de datos no está disponible
//   otros      -> mensaje genérico con el code si lo hay
// ============================================================================

/**
 * @param {number} status
 * @param {any} body  cuerpo JSON de la API ({ error: { code, message } }) o null
 * @returns {{ message:string, code:string|null, kind:'network'|'validation'|'auth'|'forbidden'|'notfound'|'conflict'|'server'|'infra' }}
 */
export function describeError(status, body) {
  const code = body?.error?.code ?? null;
  const serverMessage = body?.error?.message ?? null;

  // --- 0: no hay respuesta HTTP -------------------------------------------------
  if (status === 0) {
    return {
      kind: 'network',
      code: null,
      message:
        'No se pudo contactar al backend. ¿Está encendido en ' +
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}? ` +
        'Si está encendido, revisa CORS (FRONTEND_ORIGIN en el backend).'
    };
  }

  // --- 400: el contrato se rompió (validación) ----------------------------------
  if (status === 400) {
    const friendly = {
      SERVER_CONTROLLED_FIELD:
        'Enviaste un campo que decide el servidor (rol, dueño o fechas). El formulario no debe enviarlo.',
      INVALID_EMAIL: 'El email no tiene un formato válido.',
      INVALID_PASSWORD: 'La contraseña debe tener entre 15 y 128 caracteres.',
      TITLE_REQUIRED: 'El título no puede estar vacío.',
      INVALID_PRIORITY: 'La prioridad no es válida (low, medium o high).',
      INVALID_STATUS: 'El estado no es válido.',
      INVALID_FILTER: 'El filtro no es válido.',
      NOTHING_TO_UPDATE: 'No hay nada que actualizar: cambia al menos un campo.'
    };
    return {
      kind: 'validation',
      code,
      message: friendly[code] ?? serverMessage ?? 'La petición no cumplió el contrato.'
    };
  }

  // --- 401: no sé quién eres ----------------------------------------------------
  if (status === 401) {
    if (code === 'INVALID_CREDENTIALS') {
      return { kind: 'auth', code, message: 'Email o contraseña incorrectos.' };
    }
    if (code === 'AUTHENTICATION_REQUIRED') {
      return { kind: 'auth', code, message: 'Necesitas iniciar sesión para continuar.' };
    }
    return { kind: 'auth', code, message: 'Tu sesión no es válida o expiró. Vuelve a entrar.' };
  }

  // --- 403: sé quién eres; esto no ---------------------------------------------
  if (status === 403) {
    return {
      kind: 'forbidden',
      code,
      message: serverMessage ?? 'Tu rol no permite esta operación.'
    };
  }

  // --- 404: para ti, no existe --------------------------------------------------
  if (status === 404) {
    return {
      kind: 'notfound',
      code,
      message:
        code === 'REQUEST_NOT_FOUND'
          ? 'Esa solicitud no existe o no es tuya.'
          : 'El recurso solicitado no existe.'
    };
  }

  // --- 409: existe, pero choca --------------------------------------------------
  if (status === 409) {
    if (code === 'ACCOUNT_CANNOT_BE_CREATED') {
      return {
        kind: 'conflict',
        code,
        message: 'No se pudo crear la cuenta con esos datos. Prueba con otro email o inicia sesión.'
      };
    }
    return {
      kind: 'conflict',
      code,
      message: serverMessage ?? 'La operación choca con el estado actual de la solicitud.'
    };
  }

  // --- 503: la base no está disponible -----------------------------------------
  if (status === 503) {
    return {
      kind: 'infra',
      code,
      message: 'El backend está en línea, pero su base de datos no responde. Intenta más tarde.'
    };
  }

  // --- 500 y otros: el servidor tuvo un problema --------------------------------
  if (status >= 500) {
    return {
      kind: 'server',
      code,
      message: serverMessage ?? 'El servidor tuvo un problema inesperado. Intenta de nuevo.'
    };
  }

  return {
    kind: 'validation',
    code,
    message: serverMessage ?? 'La operación no pudo completarse.'
  };
}

// Etiqueta corta para mostrar junto al mensaje (ayuda a la rúbrica de estados).
export function errorBadge(status) {
  if (status === 0) return 'sin conexión';
  return `HTTP ${status}`;
}
