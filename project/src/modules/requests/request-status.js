// The request lifecycle, in ONE place. This file is the single source of truth for:
//   - which states exist (closed list),
//   - which states are terminal,
//   - which transitions are allowed.
// Any handler that wants to change `status` must ask here first. The map is data, not code
// scattered across conditionals, so the rule can be read (and tested) on its own.

// The closed list of allowed status values.
export const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];

// States that admit no further transitions.
export const TERMINAL_STATUSES = ['closed', 'cancelled'];

// Allowed transitions: from -> [to...]. Anything not listed here is forbidden.
// Read the absences as rules too: open -> closed does not exist.
const TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['in_progress', 'closed'],
  closed: [],
  cancelled: []
};

// True if `value` is one of the allowed statuses.
export function isValidStatus(value) {
  return STATUSES.includes(value);
}

// True if the request is in a terminal state and must not be modified at all.
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

// True if moving from `from` to `to` is an allowed transition.
export function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}
