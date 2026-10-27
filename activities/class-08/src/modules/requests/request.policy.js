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
//   claim ..................... agent, request open and unassigned (FEATURE-801)

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

// FEATURE-801 · Claim policy.
//
// The claim rule is testable with PLAIN OBJECTS: no SQL, no JWT, no
// Express, no HTTP errors. That is the whole point of putting it here.
//
// Order matters and is deliberate: the ROLE rule is evaluated first, so a
// requester always gets NOT_AGENT (403) even on a request that is also
// assigned or not open. Then the state rules: assigned beats not-open,
// because "already assigned" is the more specific conflict.
//
// Why an explicit result instead of a boolean? Claim has THREE distinct
// denial reasons and each maps to a different HTTP answer:
//   NOT_AGENT        -> 403 FORBIDDEN
//   ALREADY_ASSIGNED -> 409 REQUEST_ALREADY_ASSIGNED
//   NOT_OPEN         -> 409 REQUEST_NOT_CLAIMABLE
// The policy names the reason; the SERVICE translates it to an AppError.
export function canClaimRequest({ actor, request }) {
  if (actor.role !== 'agent') {
    return { allowed: false, reason: 'NOT_AGENT' };
  }
  if (request.assignedTo !== null && request.assignedTo !== undefined) {
    return { allowed: false, reason: 'ALREADY_ASSIGNED' };
  }
  if (request.status !== 'open') {
    return { allowed: false, reason: 'NOT_OPEN' };
  }
  return { allowed: true };
}
