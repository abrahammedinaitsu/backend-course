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

app.get('/getRequests', (req, res) => {
  res.json(requests);
});

app.get('/requests/:id', (req, res) => {
  const id = Number(req.params.id);
  const request = requests.find((item) => item.id === id);

  if (!request) {
    return res.json({ error: 'Request not found' });
  }

  res.json(request);
});

app.post('/requests', (req, res) => {
  const newRequest = {
    id: nextId,
    title: req.body.title,
    description: req.body.description,
    status: 'open',
    priority: req.body.priority
  };

  nextId = nextId + 1;
  requests.push(newRequest);

  res.status(200).json(newRequest);
});

app.listen(PORT, () => {
  console.log(`Request API Lite is running on http://localhost:${PORT}`);
});
