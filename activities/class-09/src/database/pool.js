// Single shared pool for the whole process. Every module that needs the
// database imports this pool; nobody creates their own.
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Fail early with an actionable message instead of a cryptic error on the
// first query minutes later.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Idle clients can emit 'error' (for example when the server closes the
// connection or the project gets paused). Without this handler that event
// would crash the whole process; with it, the API stays alive and the next
// query fails in a controlled way (translated to 503 by the routes).
pool.on("error", (error) => {
  console.error("[pool] idle client error:", error.code ?? error.message);
});
