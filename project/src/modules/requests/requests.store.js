// The store: SQL in, rows out. It does NOT speak HTTP (no 404, no status codes) and does not
// decide transitions. It returns rows or null; the service decides what that means.
//
// Two habits from day one:
//   * explicit columns (never `SELECT *`): the representation must not change on its own when
//     someone adds a column;
//   * every client value travels as a parameter ($1, $2…) — never concatenated into the SQL.
import { pool } from '../../database/pool.js';

// The columns of `requests`, selected explicitly and reused by every read/write.
const REQUEST_COLUMNS = 'id, title, description, priority, status, created_at, updated_at';

// SELECT with optional filters. Values are parameterized; the parameter number is derived
// from values.length so combined filters never misnumber ($1 twice).
export async function findAll({ status, priority } = {}) {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (priority) {
    values.push(priority);
    conditions.push(`priority = $${values.length}`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT ${REQUEST_COLUMNS} FROM requests${where} ORDER BY id`;

  const result = await pool.query(sql, values);
  return result.rows;
}

// One row or null. `rows[0] ?? null` makes the "does not exist" case explicit: it is a valid
// answer (404), not an infrastructure failure (503). The store promises "row or null" so the
// caller does not depend on a pg detail.
export async function findById(id) {
  const result = await pool.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

// Insert a request and return its row, in a single trip (RETURNING avoids a second SELECT).
// `status` and the timestamps use the table defaults ('open', CURRENT_TIMESTAMP).
// Accepts a client so it can join a transaction; falls back to the shared pool otherwise.
export async function create({ title, description, priority }, client = pool) {
  const result = await client.query(
    `INSERT INTO requests (title, description, priority)
     VALUES ($1, $2, $3)
     RETURNING ${REQUEST_COLUMNS}`,
    [title, description ?? null, priority ?? 'medium']
  );
  return result.rows[0];
}

// Partial UPDATE built from an allowlist of columns. The column NAMES come from this code
// (never from the client); only the VALUES are parameterized.
const UPDATABLE_COLUMNS = ['title', 'description', 'priority'];

export async function update(id, changes, client = pool) {
  const sets = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (changes[column] !== undefined) {
      values.push(changes[column]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  // No updatable field: return the current row untouched instead of running a broken UPDATE.
  if (sets.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await client.query(
    `UPDATE requests
     SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING ${REQUEST_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

// Change ONLY the status and return the updated row. Requires a client on purpose: it must run
// inside the transaction that also writes the history.
export async function updateStatus(id, newStatus, client) {
  const result = await client.query(
    `UPDATE requests
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING ${REQUEST_COLUMNS}`,
    [newStatus, id]
  );
  return result.rows[0] ?? null;
}

// Append one history event. `previousStatus` may be null: the birth (`NULL -> open`).
// Requires a client on purpose (same reason as updateStatus).
//
// FAULT INJECTION (for the Entrega 04 rollback demo only): if INJECT_HISTORY_FAILURE is set,
// this throws a simulated constraint failure right here — between the UPDATE and the history
// INSERT — so the transaction must roll back the already-applied status change. It is OFF by
// default and is a temporary demonstration hook, not part of the real logic.
export async function insertHistory(requestId, previousStatus, newStatus, client) {
  if (process.env.INJECT_HISTORY_FAILURE === 'true') {
    const injected = new Error('Injected failure in history insert (rollback demo)');
    injected.code = '23514'; // looks like a CHECK violation to the error handler
    throw injected;
  }
  await client.query(
    `INSERT INTO request_status_history (request_id, previous_status, new_status)
     VALUES ($1, $2, $3)`,
    [requestId, previousStatus, newStatus]
  );
}

// All history events of one request, oldest first. Returns [] when there are none.
export async function findHistory(requestId) {
  const result = await pool.query(
    `SELECT id, request_id, previous_status, new_status, changed_at
     FROM request_status_history
     WHERE request_id = $1
     ORDER BY changed_at, id`,
    [requestId]
  );
  return result.rows;
}
