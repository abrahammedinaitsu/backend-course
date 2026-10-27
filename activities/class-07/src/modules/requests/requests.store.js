// Data access for the requests module. It runs parameterized queries and
// returns rows (or null); it knows nothing about HTTP status codes or
// domain transitions. Every function accepts an optional `db` so the
// service can pass a transaction client — defaulting to the shared pool.

import { pool } from '../../database/pool.js';

const REQUEST_COLUMNS = `
  id,
  title,
  description,
  priority,
  status,
  created_by,
  created_at,
  updated_at
`;

export async function findAll(filters = {}, db = pool) {
  // Values are parameterized; column names come from this file only —
  // identifiers are never derived from client input.
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.priority) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }
  // Ownership scoping happens HERE, in SQL. Loading everything and
  // filtering in JavaScript would ship other people's data into the
  // process just to throw it away.
  if (filters.createdBy) {
    values.push(filters.createdBy);
    conditions.push(`created_by = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests ${where} ORDER BY id`,
    values
  );
  return result.rows;
}

export async function findById(id, db = pool) {
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function insertRequest({ title, description, priority, createdBy }, db = pool) {
  // The database generates id, status default, and both timestamps.
  // createdBy comes from the service — from the authenticated actor,
  // never from the request body.
  const result = await db.query(
    `INSERT INTO requests (title, description, priority, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${REQUEST_COLUMNS}`,
    [title, description, priority, createdBy]
  );
  return result.rows[0];
}

export async function updateRequest(id, changes, db = pool) {
  const assignments = [];
  const values = [];

  for (const field of ['title', 'description', 'priority', 'status']) {
    if (changes[field] !== undefined) {
      values.push(changes[field]);
      assignments.push(`${field} = $${values.length}`);
    }
  }

  values.push(id);
  const result = await db.query(
    `UPDATE requests
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING ${REQUEST_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function insertHistoryEvent(event, db = pool) {
  // One writer for both event types. The service decides WHICH fields the
  // event carries; unused columns stay NULL.
  const { requestId, type, fromStatus, toStatus, fromPriority, toPriority, changedBy } = event;
  await db.query(
    `INSERT INTO request_history
       (request_id, type, from_status, to_status, from_priority, to_priority, changed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [requestId, type, fromStatus ?? null, toStatus ?? null,
      fromPriority ?? null, toPriority ?? null, changedBy ?? null]
  );
}

export async function findHistory(requestId, db = pool) {
  // Oldest first; the id is the STABLE tie-breaker when two events share
  // the same timestamp.
  const result = await db.query(
    `SELECT id, type, from_status, to_status, from_priority, to_priority, created_at
     FROM request_history
     WHERE request_id = $1
     ORDER BY created_at, id`,
    [requestId]
  );
  return result.rows;
}
