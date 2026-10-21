import express from 'express';
import { requests, generateId } from '../data/requests.js';

const router = express.Router();

// This router is mounted at /requests in app.js, so '/' here means GET /requests.

// GET /requests -> 200 with the full list of requests (a JSON array, even when empty).
router.get('/', (req, res) => {
  res.status(200).json(requests);
});

// GET /requests/:id -> 200 with the request, or 404 if it does not exist.
router.get('/:id', (req, res) => {
  // req.params.id always arrives as a string, so it is compared as a number.
  const id = Number(req.params.id);
  const request = requests.find((item) => item.id === id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.status(200).json(request);
});

// POST /requests -> 201 with the created request, or 400 when the title is missing/blank.
router.post('/', (req, res) => {
  const title = req.body.title;

  // Validate BEFORE mutating the store: an incomplete request changes nothing.
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newRequest = {
    id: generateId(),
    title: title.trim(),
    description: req.body.description,
    status: 'open',
    priority: req.body.priority
  };

  requests.push(newRequest);

  res.status(201).json(newRequest);
});

export default router;
