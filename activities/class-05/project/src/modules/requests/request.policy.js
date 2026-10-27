// Política de autorización: funciones PURAS sobre un actor y (cuando hace falta) una
// representación de solicitud. Sin SQL, sin HTTP, sin efectos. El middleware dice QUIÉN;
// estas funciones dicen QUÉ está permitido; el service conserva las reglas del caso de uso.
//
// La matriz de acceso del taller es FIJA (el validador depende de ella):
//   listar todas .............. agent
//   listar las propias ........ requester (se acota en SQL, estación 6)
//   ver / historial ........... agent: cualquiera | requester: solo propias
//   crear ..................... requester (los agent no crean)
//   editar título/descripción . requester, propia y abierta
//   cambiar prioridad ......... agent
//   cambiar estado ............ agent (la máquina de estados sigue aplicando)
//
// Solicitudes heredadas (createdBy === null) no son de nadie: solo las ven los agent. Un
// requester jamás puede coincidir con un dueño nulo.

// ¿Puede este actor pedir la colección COMPLETA (sin acotar a lo propio)?
export function canListAllRequests(actor) {
  return actor?.role === 'agent';
}

// ¿Puede este actor VER esta solicitud? El agent ve cualquiera; el requester solo las suyas.
// Un dueño nulo (heredada) NO es del requester: la comparación estricta lo deja fuera.
export function canViewRequest(actor, request) {
  if (actor?.role === 'agent') return true;
  return request?.createdBy !== null && request?.createdBy !== undefined
    && request.createdBy === actor?.userId;
}

// El historial es tan privado como la solicitud misma: la misma regla.
export function canViewHistory(actor, request) {
  return canViewRequest(actor, request);
}

// Solo el requester crea. Quien atiende (agent) no genera demanda con su propia cuenta.
export function canCreateRequest(actor) {
  return actor?.role === 'requester';
}

// Editar CONTENIDO (título/descripción): requester, sobre lo PROPIO y mientras siga ABIERTO.
// Son dos condiciones de naturaleza distinta: propiedad (¿es tuya?) y estado (¿sigue abierta?).
// En cuanto un agent trabaja la solicitud, cambiar el enunciado rompería la trazabilidad.
export function canEditContent(actor, request) {
  return actor?.role === 'requester'
    && request?.createdBy === actor?.userId
    && request?.status === 'open';
}

// Cambiar PRIORIDAD: solo el agent (es trabajo del flujo de atención).
export function canChangePriority(actor) {
  return actor?.role === 'agent';
}

// Cambiar ESTADO: solo el agent. La máquina de estados (clase 03) sigue aplicando DESPUÉS,
// dentro del service: el rol amplía permisos, no deroga las reglas del dominio.
export function canChangeStatus(actor) {
  return actor?.role === 'agent';
}
