// Authorization policy for the requests module. Pure functions over an
// actor and (when relevant) a request representation: no SQL, no HTTP.
// The middleware establishes WHO the actor is; these functions decide
// WHAT the actor may do; the service keeps the use-case rules.
//
// Workshop access matrix (fixed baseline — the validator relies on it):
//   list all requests ......... agent
//   list own requests ......... requester (scoped in SQL, not in JS)
//   view / history ............ agent: any · requester: own only
//   create .................... requester
//   edit title/description .... requester, own request, while open
//   change priority ........... agent
//   change status ............. agent (state machine still applies)
//   claim ..................... agent, request open and unassigned

export function canListAllRequests(actor) {
  return actor.role === 'agent';
}

export function canViewRequest(actor, request) {
  if (actor.role === 'agent') return true;
  return request.createdBy === actor.userId;
}

export function canViewHistory(actor, request) {
  return canViewRequest(actor, request);
}

export function canCreateRequest(actor) {
  return actor.role === 'requester';
}

export function canEditContent(actor, request) {
  return actor.role === 'requester'
    && request.createdBy === actor.userId
    && request.status === 'open';
}

export function canChangePriority(actor) {
  return actor.role === 'agent';
}

export function canChangeStatus(actor) {
  return actor.role === 'agent';
}

// FEATURE-801. Claim has THREE distinct denial reasons and each one maps
// to a different HTTP answer, so this policy returns an explicit result
// instead of a bare boolean: { allowed: true } or { allowed: false, reason }.
//
//   NOT_AGENT        -> the actor's role cannot claim (403)
//   ALREADY_ASSIGNED -> someone is responsible already (409)
//   NOT_OPEN         -> the lifecycle does not allow claiming (409)
//
// The policy stays pure: it never touches PostgreSQL, never reads a JWT
// and never builds HTTP errors — that is why it can be tested with plain
// objects and zero infrastructure.
export function canClaimRequest({ actor, request }) {
  if (actor.role !== 'agent') {
    return { allowed: false, reason: 'NOT_AGENT' };
  }
  if (request.assignedTo) {
    return { allowed: false, reason: 'ALREADY_ASSIGNED' };
  }
  if (request.status !== 'open') {
    return { allowed: false, reason: 'NOT_OPEN' };
  }
  return { allowed: true };
}
