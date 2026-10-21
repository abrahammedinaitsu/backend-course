// In-memory store for maintenance requests.
// There is no database: the data resets on every restart. That is EXPECTED and documented.
// This is the only file that should change when a real database appears.
//
// Identity rule: `nextRequestId` only moves forward. It never derives from array length,
// because the length changes while identity must not. (Restarting resets it — a known limit.)
export const requests = [
  {
    id: 1,
    title: 'Projector does not turn on',
    description: 'The projector in room 204 shows no image during class.',
    status: 'open',
    priority: 'high',
    createdAt: '2026-10-21T00:20:00.000Z',
    updatedAt: '2026-10-21T00:20:00.000Z'
  },
  {
    id: 2,
    title: 'Broken chair in the lab',
    description: 'One chair in the computer lab has a loose back rest.',
    status: 'in_progress',
    priority: 'medium',
    createdAt: '2026-10-21T00:21:00.000Z',
    updatedAt: '2026-10-21T00:21:00.000Z'
  },
  {
    id: 3,
    title: 'Wi-Fi drops in the library',
    description: 'The connection drops every few minutes on the second floor.',
    status: 'open',
    priority: 'low',
    createdAt: '2026-10-21T00:22:00.000Z',
    updatedAt: '2026-10-21T00:22:00.000Z'
  }
];

// The identifier for the next request that gets created. Forward-only.
let nextRequestId = 4;

// Returns a fresh identifier and prepares the following one.
export function generateId() {
  const id = nextRequestId;
  nextRequestId = nextRequestId + 1;
  return id;
}

// Returns all requests, optionally filtered by status and/or priority.
export function findAll({ status, priority } = {}) {
  return requests.filter((request) => {
    if (status && request.status !== status) return false;
    if (priority && request.priority !== priority) return false;
    return true;
  });
}

// Finds a request by numeric id, or undefined.
export function findById(id) {
  return requests.find((request) => request.id === id);
}

// Adds a fully-built request object to the store.
export function add(request) {
  requests.push(request);
}
