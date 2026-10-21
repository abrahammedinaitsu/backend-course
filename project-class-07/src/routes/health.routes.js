// OPS-703 · Operational endpoints (guided skeleton).
//
// Two DIFFERENT questions:
//   GET /health  "Is the process alive?"        -> never touches PostgreSQL
//   GET /ready   "Can it do useful work now?"   -> checks PostgreSQL cheaply
// Reference: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/
//
// TODO(OPS-703): implement both routes. Checklist:
//   [ ] GET /health answers 200 { "status": "ok" } — nothing more. It must
//       keep answering even when the database is down.
//   [ ] The database check is INJECTABLE: createHealthRouter accepts an
//       optional checkDatabase function, and defaults to the cheapest
//       possible real query (SELECT 1 through the shared pool). That is
//       what lets a test hand in a failing check without breaking real
//       credentials.
//   [ ] GET /ready runs the check:
//         success -> 200 { "status": "ready",     "database": "available" }
//         failure -> 503 { "status": "not_ready", "database": "unavailable" }
//       The failure answer is DELIBERATE (a controlled 503, not a crash)
//       and reveals nothing: no host, no port, no user, no SQL, no stack.
//
// Questions before coding:
//   - Can the process be alive but not ready? Who needs to distinguish that?
//   - Why is 503 the right code here, and how is it different from 500?
import express from 'express';
import { pool } from '../database/pool.js';

export function createHealthRouter({ checkDatabase } = {}) {
  const router = express.Router();

  // TODO(OPS-703): add GET /health and GET /ready here.

  return router;
}

export const healthRoutes = createHealthRouter();
