// Reproducible seeder. Creates the workshop dataset AFTER the migrations:
// known users, requests in different states/priorities, and history events.
//
// Repeatable by design: seed users are identified by their exclusive
// *.seed@example.test emails; on each run the seeder removes ONLY the
// requests (and their history) belonging to those users and recreates them.
// It never touches data created by anyone else, and it never truncates.
import 'dotenv/config';
import { pool } from '../src/database/pool.js';
import { hashPassword } from '../src/modules/auth/password.js';

// Known workshop credentials (demo data, not real secrets). Passwords are
// stored HASHED — the plain text lives only here and in the class material.
const SEED_USERS = [
  { email: 'ana.requester.seed@example.test', password: 'ana clave del taller 06', role: 'requester' },
  { email: 'luis.requester.seed@example.test', password: 'luis clave del taller 06', role: 'requester' },
  { email: 'maria.agent.seed@example.test', password: 'maria clave del taller 06', role: 'agent' }
];

// The scenario matters: Ana must have NO closed requests (BUG-106 needs a
// valid filter with zero matches), Luis covers the states Ana does not.
const SEED_REQUESTS = [
  { owner: 'ana.requester.seed@example.test', title: 'Mi laptop no enciende', priority: 'high', status: 'open',
    history: [] },
  { owner: 'ana.requester.seed@example.test', title: 'No puedo entrar a la VPN', priority: 'medium', status: 'in_progress',
    history: [{ type: 'status', to: 'in_progress' }] },
  { owner: 'ana.requester.seed@example.test', title: 'El proyector de la sala 2 parpadea', priority: 'low', status: 'resolved',
    history: [{ type: 'status', to: 'in_progress' }, { type: 'priority', to: 'low', from: 'medium' }, { type: 'status', from: 'in_progress', to: 'resolved' }] },
  { owner: 'luis.requester.seed@example.test', title: 'Solicito acceso al repositorio del equipo', priority: 'medium', status: 'open',
    history: [] },
  { owner: 'luis.requester.seed@example.test', title: 'La impresora del piso 3 atasca papel', priority: 'high', status: 'closed',
    history: [{ type: 'status', to: 'in_progress' }, { type: 'priority', from: 'medium', to: 'high' }, { type: 'status', from: 'in_progress', to: 'resolved' }, { type: 'status', from: 'resolved', to: 'closed' }] },
  { owner: 'luis.requester.seed@example.test', title: 'Mi cuenta de correo rebota mensajes', priority: 'medium', status: 'cancelled',
    history: [{ type: 'status', from: 'open', to: 'cancelled' }] }
];

async function main() {
  console.log('DATABASE SEED\n');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1 · Users: create the missing ones, keep the existing ones (their ids
    // may already be referenced by student experiments).
    const userIds = {};
    for (const user of SEED_USERS) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows[0]) {
        userIds[user.email] = existing.rows[0].id;
        continue;
      }
      const passwordHash = await hashPassword(user.password);
      const inserted = await client.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [user.email, passwordHash, user.role]
      );
      userIds[user.email] = inserted.rows[0].id;
    }

    // 2 · Remove ONLY the seed users' requests (history first: the foreign
    // key protects orphan events). Everything else in the database survives.
    const seedIds = Object.values(userIds);
    await client.query(
      `DELETE FROM request_history
       WHERE request_id IN (SELECT id FROM requests WHERE created_by = ANY($1::uuid[]))`,
      [seedIds]
    );
    await client.query('DELETE FROM requests WHERE created_by = ANY($1::uuid[])', [seedIds]);

    // 3 · Recreate the scenario. Every request is born open with a birth
    // event; later events replay its story in order.
    let requestCount = 0;
    let eventCount = 0;
    const agentId = userIds['maria.agent.seed@example.test'];
    for (const spec of SEED_REQUESTS) {
      const ownerId = userIds[spec.owner];
      const inserted = await client.query(
        `INSERT INTO requests (title, description, priority, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [spec.title, 'Solicitud de demostración del taller (seed).', spec.priority, spec.status, ownerId]
      );
      const requestId = inserted.rows[0].id;
      requestCount += 1;

      const events = [{ kind: 'status', from: null, to: 'open', by: ownerId }];
      let lastStatus = 'open';
      for (const step of spec.history) {
        if (step.type === 'status') {
          events.push({ kind: 'status', from: step.from ?? lastStatus, to: step.to, by: agentId });
          lastStatus = step.to;
        } else {
          events.push({ kind: 'priority', fromP: step.from ?? 'medium', toP: step.to, by: agentId });
        }
      }
      for (const event of events) {
        await client.query(
          `INSERT INTO request_history
             (request_id, type, from_status, to_status, from_priority, to_priority, changed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          event.kind === 'status'
            ? [requestId, 'status_changed', event.from, event.to, null, null, event.by]
            : [requestId, 'priority_changed', null, null, event.fromP, event.toP, event.by]
        );
        eventCount += 1;
      }
    }

    await client.query('COMMIT');

    console.log('Users');
    console.log('- 2 requesters ready');
    console.log('- 1 agent ready');
    console.log('\nRequests');
    console.log(`- ${requestCount} requests ready`);
    console.log(`- ${eventCount} history events ready`);
    console.log('\nSeed completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nSeed failed and was rolled back:', error.code ?? error.message);
    if (error.code === '42P01') {
      console.error('A table is missing. Run the migrations first: npm run db:migrate');
    }
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
