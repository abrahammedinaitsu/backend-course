// Cleanup helper. Deletes ONLY the rows this test run created, by their
// recorded ids, in dependency order: history -> requests -> users.
// Never a broad DELETE, never TRUNCATE — the seed and the student's own
// data must survive every test run.
import { pool } from '../../src/database/pool.js';
import { createdUserIds, createdRequestIds } from './test-data.js';

export async function cleanupCreatedData() {
  if (createdRequestIds.length) {
    await pool.query(
      'DELETE FROM request_history WHERE request_id = ANY($1::bigint[])',
      [createdRequestIds]
    );
    await pool.query(
      'DELETE FROM requests WHERE id = ANY($1::bigint[])',
      [createdRequestIds]
    );
    createdRequestIds.length = 0;
  }
  if (createdUserIds.length) {
    await pool.query(
      'DELETE FROM request_history WHERE changed_by = ANY($1::uuid[])',
      [createdUserIds]
    );
    await pool.query(
      'DELETE FROM users WHERE id = ANY($1::uuid[])',
      [createdUserIds]
    );
    createdUserIds.length = 0;
  }
}

export async function closePool() {
  await pool.end();
}
