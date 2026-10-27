// Environment doctor for class 09. Non-destructive: it only reads. Run it
// BEFORE touching any code — if the baseline is broken, you cannot tell a
// ticket failure from an environment failure. It never prints secrets.
//
// It assumes the Supabase project you have used since class 06: same
// database, same migrations (001-005, all already known), same seed users.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
let failDetails = null;

function report(name, ok) {
  results.push([name, ok]);
}

function printResults() {
  console.log('CLASS 09 ENVIRONMENT CHECK\n');
  const total = results.length;
  results.forEach(([name, ok], index) => {
    const label = `[${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}] ${name} `;
    console.log(`${label}${'.'.repeat(Math.max(2, 46 - label.length))} ${ok ? 'PASS' : 'FAIL'}`);
  });
  console.log('');
}

function printFailure() {
  if (!failDetails) return;
  console.log(`FAIL: ${failDetails.what}\n`);
  console.log('Possible causes:');
  for (const cause of failDetails.causes) console.log(`- ${cause}`);
  console.log('\nNext actions:');
  failDetails.actions.forEach((item, index) => console.log(`${index + 1}. ${item}`));
  console.log(`\nRecovery guide: ${failDetails.recovery}`);
}

function explainConnectionError(error) {
  const code = error.code ?? '';
  if (code === '28P01' || /password authentication/i.test(error.message)) {
    return {
      what: 'PostgreSQL rejected the credentials.',
      causes: ['The password inside DATABASE_URL is incorrect.',
        'The password contains special characters that need URL encoding.'],
      actions: ['Re-copy the connection string from the Supabase Connect dialog.',
        'Reset the database password if needed, update .env, run the doctor again.'],
      recovery: 'recovery/environment.md'
    };
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      what: 'The hostname inside DATABASE_URL could not be resolved.',
      causes: ['The connection string is incomplete or was typed by hand.',
        'Your network cannot reach the direct (IPv6) endpoint.'],
      actions: ['Copy the string from the Supabase Connect dialog — never type the host.',
        'On IPv4-only networks use the Session pooler string from the same dialog.'],
      recovery: 'recovery/environment.md'
    };
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || /timeout/i.test(error.message)) {
    return {
      what: 'The database host did not answer in time.',
      causes: ['The Supabase project is paused (free projects pause after inactivity).',
        'A firewall or the network blocks the port.'],
      actions: ['Open the Supabase dashboard and restore the project if it is paused.',
        'Wait until it reports Active, then run the doctor again.'],
      recovery: 'recovery/environment.md'
    };
  }
  return {
    what: 'Could not connect to PostgreSQL.',
    causes: ['The password is incorrect.', 'The connection string is incomplete.',
      'Your network cannot reach the endpoint.'],
    actions: ['Copy the connection string again from the Supabase Connect dialog.',
      'If the direct connection fails, try the Session pooler string.'],
    recovery: 'recovery/environment.md'
  };
}

// ---------------------------------------------------------- 01 environment

const envPath = path.join(ROOT, '.env');
let envOk = existsSync(envPath);
if (envOk) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: envPath });
  envOk = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
}
report('Environment configured', envOk);
if (!envOk) {
  printResults();
  console.log('FAIL: .env is missing or incomplete.\n');
  console.log('Possible causes:');
  console.log('- You have not created your local configuration yet.');
  console.log('- DATABASE_URL or JWT_SECRET is empty.');
  console.log('\nNext actions:');
  console.log('1. Copy the example file:  cp .env.example .env');
  console.log('2. Paste the DATABASE_URL you have used since class 06 (Supabase Connect dialog).');
  console.log('3. Generate a secret if needed:  npm run generate:secret');
  console.log('\nRecovery guide: recovery/environment.md');
  process.exit(1);
}

// ---------------------------------------------------------- 02 connection

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 12000
});

try {
  await client.connect();
  await client.query('SELECT 1');
  report('Database connection established', true);
} catch (error) {
  report('Database connection established', false);
  failDetails = explainConnectionError(error);
  printResults();
  printFailure();
  process.exit(1);
}

// ---------------------------------------------------------- 03 migrations

const tables = (await client.query(
  // Unqualified names resolve through the session's search_path — the very
  // schema the application connects to. Hardcoding 'public.' would report the
  // wrong answer when DATABASE_URL points the search_path elsewhere (the
  // class 06-09 workshop lives in its own `class06` schema so it can share
  // one Supabase project with the earlier classes).
  `SELECT to_regclass('schema_migrations') AS ledger,
          to_regclass('users') AS users,
          to_regclass('requests') AS requests,
          to_regclass('request_history') AS history`
)).rows[0];

let migrationsOk = false;
let pendingCount = 0;
if (tables.ledger && tables.users && tables.requests && tables.history) {
  const files = readdirSync(path.join(ROOT, 'database', 'migrations'))
    .filter((file) => file.endsWith('.sql'));
  const applied = new Set(
    (await client.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name)
  );
  pendingCount = files.filter((file) => !applied.has(file)).length;
  migrationsOk = pendingCount === 0;
}
report('Migrations available', migrationsOk);

// ---------------------------------------------------------------- 04 seed

let seedOk = false;
if (tables.users && tables.requests) {
  const seedUsers = await client.query(
    `SELECT count(*)::int AS n FROM users WHERE email LIKE '%.seed@example.test'`
  );
  const seedRequests = await client.query(
    `SELECT count(*)::int AS n FROM requests
     WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%.seed@example.test')`
  );
  seedOk = seedUsers.rows[0].n >= 3 && seedRequests.rows[0].n >= 4;
}
report('Seed data available', seedOk);

await client.end();

// ----------------------------------------------------------------- 05 app

let appOk = true;
try {
  await import('../src/app.js');
} catch {
  appOk = false;
}
report('Application can be imported', appOk);

// --------------------------------------------------------- 06 test runner

const major = Number(process.version.slice(1).split('.')[0]);
report('Test runner available', Number.isInteger(major) && major >= 20);

// --------------------------------------------------- 07 assessment kit

const kit = ['assessment/evaluator-prompt.md',
  'assessment/report-schema.json',
  'scripts/prepare-assessment.js',
  'scripts/validate-assessment-report.js',
  'activities/class-09'];
report('Assessment kit available',
  kit.every((rel) => existsSync(path.join(ROOT, rel))));

// ----------------------------------------------------------------- output

printResults();

const allOk = results.every(([, ok]) => ok);
if (allOk) {
  console.log('Environment ready: assessment first, then the legacy-system workshop.');
  process.exit(0);
}

if (!migrationsOk) {
  console.log(pendingCount > 0
    ? `There are ${pendingCount} pending migration(s).`
    : 'The database schema is not installed yet.');
  console.log('Next command: npm run db:migrate');
  console.log('Recovery guide: recovery/environment.md');
} else if (!seedOk) {
  console.log('The schema exists but the workshop data is missing or incomplete.');
  console.log('Next command: npm run db:seed');
  console.log('Recovery guide: recovery/environment.md');
} else if (!appOk) {
  console.log('The application failed to load. Check JWT_SECRET in .env.');
  console.log('Recovery guide: recovery/environment.md');
} else {
  console.log('Something in the environment is not ready. Review the FAIL lines above.');
}
process.exit(1);
