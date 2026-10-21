// In-memory storage. There is no database: the data resets on every restart.
// This is the ONLY file that should change when a real database appears.
export const requests = [
  {
    id: 1,
    title: 'Projector does not turn on',
    description: 'The projector in room 204 shows no image during class.',
    status: 'open',
    priority: 'high'
  },
  {
    id: 2,
    title: 'Broken chair in the lab',
    description: 'One chair in the computer lab has a loose back rest.',
    status: 'in-progress',
    priority: 'medium'
  },
  {
    id: 3,
    title: 'Wi-Fi drops in the library',
    description: 'The connection drops every few minutes on the second floor.',
    status: 'open',
    priority: 'low'
  }
];

// Identifier for the next request that gets created.
let nextId = 4;

// Returns a fresh identifier and prepares the following one.
export function generateId() {
  const id = nextId;
  nextId = nextId + 1;
  return id;
}
