// Domain rules for the request lifecycle. Unchanged since class 03:
// pure domain rules do not depend on where the data lives.

export const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];

export const TERMINAL_STATUSES = ['closed', 'cancelled'];

const ALLOWED_TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['in_progress', 'closed'],
  closed: [],
  cancelled: []
};

export function isValidStatus(status) {
  return STATUSES.includes(status);
}

export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
