// Infrastructure for "all or nothing" units of work. It knows nothing about requests.
//
// THE RULE THAT MATTERS: every query inside the unit runs on the SAME client, borrowed once
// with pool.connect(). pool.query() may use a DIFFERENT connection on each call, which would
// leave those queries OUTSIDE the transaction with no visible error.
//
//   BEGIN  opens the unit       (everything after this is provisional)
//   COMMIT makes it permanent   (all provisional writes land together)
//   ROLLBACK discards it        (the database returns to its previous state)
//   release in `finally` returns the loan no matter what — a missing release leaks a client
//                        and, repeated, exhausts the pool and freezes the whole API.
import { pool } from './pool.js';

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // Reverting is not hiding: roll back and rethrow so the caller still responds.
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
