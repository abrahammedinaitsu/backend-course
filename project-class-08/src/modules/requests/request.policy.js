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

// TODO(FEATURE-801) · Claim policy (guided skeleton).
//
// The claim rule must be testable with PLAIN OBJECTS: no SQL, no JWT, no
// Express, no HTTP errors. That is the whole point of putting it here.
//
// Checklist:
//   [ ] Receive { actor, request } (already-mapped representation).
//   [ ] Only an agent may claim               -> reason 'NOT_AGENT'
//   [ ] An assigned request cannot be claimed -> reason 'ALREADY_ASSIGNED'
//   [ ] Only an open request can be claimed   -> reason 'NOT_OPEN'
//   [ ] Otherwise: { allowed: true }
//
// Why an explicit result instead of a boolean? Claim has THREE distinct
// denial reasons and each maps to a different HTTP answer (403/409/409).
// The policy names the reason; the SERVICE translates it to an AppError.
export function canClaimRequest({ actor, request }) {
  // TODO(FEATURE-801): replace this placeholder with the real rules.
  return { allowed: false, reason: 'NOT_IMPLEMENTED' };
}
