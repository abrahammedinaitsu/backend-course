import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

// Maintenance requests are kept in memory, so they reset every time the server restarts.
const requests = [
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

let nextId = 4;

// FIX 1 — The listing route is the resource itself: '/requests' (noun), not '/getRequests'.
// The HTTP method (GET) already expresses the operation, so the path must not repeat it.
app.get('/requests', (req, res) => {
  res.json(requests);
});

app.get('/requests/:id', (req, res) => {
  const id = Number(req.params.id);
  const request = requests.find((item) => item.id === id);

  if (!request) {
    // FIX 2 — A non-existent resource must not answer 200. It answers 404, so a client
    // that decides by the status code can tell "exists" from "does not exist".
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json(request);
});

app.post('/requests', (req, res) => {
  const title = req.body.title;

  // FIX 4 — Validate before mutating: a missing or blank title means the client request is
  // incomplete, so it answers 400 and does NOT push anything into the collection.
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newRequest = {
    id: nextId,
    title: title.trim(),
    description: req.body.description,
    status: 'open',
    priority: req.body.priority
  };

  nextId = nextId + 1;
  requests.push(newRequest);

  // FIX 3 — Creating a new resource answers 201 Created, not 200. 200 is reserved for
  // successful reads/updates; 201 tells the client a new resource now exists.
  res.status(201).json(newRequest);
});

app.listen(PORT, () => {
  console.log(`Request API Lite is running on http://localhost:${PORT}`);
});
