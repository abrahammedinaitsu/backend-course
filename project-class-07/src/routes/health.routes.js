// OPS-703 · Operational endpoints.
//
// Two DIFFERENT questions:
//   GET /health  "Is the process alive?"        -> never touches PostgreSQL
//   GET /ready   "Can it do useful work now?"   -> checks PostgreSQL cheaply
// Reference: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/
import express from 'express';
import { pool } from '../database/pool.js';

// The cheapest possible real check: one round trip, no tables, no data.
async function defaultCheckDatabase() {
  await pool.query('SELECT 1');
}

export function createHealthRouter({ checkDatabase = defaultCheckDatabase } = {}) {
  const router = express.Router();

  // Liveness: the process is alive. It must answer even when the database
  // is down, so it does NOT touch PostgreSQL at all.
  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness: can this instance do useful work right now? It runs the
  // injectable check. A failure is a DELIBERATE controlled 503, not a
  // crash, and reveals nothing: no host, no port, no user, no SQL.
  router.get('/ready', async (req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: 'ready', database: 'available' });
    } catch {
      res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  return router;
}

export const healthRoutes = createHealthRouter();
