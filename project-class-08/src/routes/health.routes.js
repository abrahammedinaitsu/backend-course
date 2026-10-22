// Operational endpoints. Two different questions:
//
//   GET /health  "Is the process alive and answering?"
//                Never touches PostgreSQL: a liveness probe that depends
//                on the database would report the process as dead when
//                only its dependency is down.
//
//   GET /ready   "Can this instance do useful work right now?"
//                Checks PostgreSQL with the cheapest possible query. When
//                the check fails it answers 503 — a deliberate, expected
//                response, not an unexpected error — and reveals nothing
//                about hosts, users or connection strings.
//
// The database check is injectable so a test can hand in a failing check
// without touching real credentials or disconnecting a real database.
import express from 'express';
import { pool } from '../database/pool.js';
import { logger } from '../logging/logger.js';

export function createHealthRouter({ checkDatabase } = {}) {
  const check = checkDatabase ?? (async () => {
    await pool.query('SELECT 1');
  });

  const router = express.Router();

  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/ready', async (req, res) => {
    try {
      await check();
      res.status(200).json({ status: 'ready', database: 'available' });
    } catch (error) {
      // The detail stays in the log; the response only says "not ready".
      logger.error('readiness_check_failed', {
        requestId: req.requestId,
        code: error.code ?? error.message
      });
      res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  return router;
}

export const healthRoutes = createHealthRouter();
