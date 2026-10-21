// The single pool for the whole process. Any file that needs the database imports THIS pool.
// Never create a Pool per request or per module: that multiplies pools and exhausts connections.
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Fail early with an actionable message: a clear error at startup beats a cryptic one
// minutes later on the first query.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
