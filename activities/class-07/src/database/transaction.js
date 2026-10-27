// Runs a unit of work inside a single transaction. Every query inside the
// unit MUST use the client passed to `work` — pool.query() could grab a
// different connection and silently escape the transaction.
import { pool } from "./pool.js";

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    // Reverting is not hiding: the caller still needs to answer the request.
    throw error;
  } finally {
    // Always return the loan — releasing gives the connection back to the
    // pool; it does not close the database.
    client.release();
  }
}
