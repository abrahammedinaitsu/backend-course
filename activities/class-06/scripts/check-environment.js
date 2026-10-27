// Environment doctor. Non-destructive: it only reads. Run it whenever you
// are not sure WHERE a problem lives (environment, database, schema, seed
// or application). It never prints secrets.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
let stopped = false;

function report(name, ok) {
  results.push([name, ok]);
}

function printResults(title) {
  console.log(`${title}\n`);
  const total = results.length;
  results.forEach(([name, ok], index) => {
    const label = `[${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}] ${name} `;
    console.log(`${label}${'.'.repeat(Math.max(2, 46 - label.length))} ${ok ? 'PASS' : 'FAIL'}`);
  });
  console.log('');
}

function fail(name, explanation) {
  report(name, false);
  stopped = true;
  failDetails = explanation;
}

let failDetails = null;

function explainConnectionError(error) {
  const code = error.code ?? '';
  if (code === '28P01' || /password authentication/i.test(error.message)) {
    return {
      what: 'PostgreSQL rejected the credentials.',
      causes: ['The password inside DATABASE_URL is incorrect.',
        'The password contains special characters that need URL encoding.'],
      inspect: ['The Connect dialog in Supabase (copy the string again).',
        'Whether your password has characters like @ : / # inside.'],
      next: 'Reset or re-copy the database password, update .env, run the doctor again.',
      recovery: 'recovery/database-connection.md'
    };
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      what: 'The hostname inside DATABASE_URL could not be resolved.',
      causes: ['The connection string is incomplete or was typed by hand.',
        'Your network cannot reach the direct (IPv6) endpoint.'],
      inspect: ['Copy the string from the Supabase Connect dialog — never type the host.',
        'If the direct connection fails, use the Session pooler string from the same dialog.'],
      next: 'Re-copy the connection string; try Session pooler on IPv4-only networks.',
      recovery: 'recovery/database-connection.md'
    };
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || /timeout/i.test(error.message)) {
    return {
      what: 'The database host did not answer in time.',
      causes: ['The Supabase project is still starting or is paused.',
        'A firewall or the network blocks the port.',
        'Your network cannot reach the direct endpoint.'],
      inspect: ['The project status in the Supabase dashboard.',
        'The Session pooler alternative in the Connect dialog.'],
      next: 'Wait for the project to be ready (or restore it), then run the doctor again.',
      recovery: 'recovery/database-connection.md'
    };
  }
  return {
    what: 'Could not connect to PostgreSQL.',
    causes: ['The password is incorrect.', 'The connection string is incomplete.',
      'Your network cannot reach the endpoint.'],
    inspect: ['The Supabase Connect dialog.', 'Your .env file (without sharing it).'],
    next: 'Copy the connection string again; if direct fails, try Session pooler.',
    recovery: 'recovery/database-connection.md'
  };
}

function printFailure() {
  if (!failDetails) return;
  console.log(`FAIL: ${failDetails.what}\n`);
  console.log('Possible causes:');
  for (const cause of failDetails.causes) console.log(`- ${cause}`);
  console.log('\nNext actions:');
  failDetails.inspect.forEach((item, index) => console.log(`${index + 1}. ${item}`));
  console.log(`${failDetails.inspect.length + 1}. ${failDetails.next}`);
  console.log(`\nRecovery guide: ${failDetails.recovery}`);
}

// ---------------------------------------------------------------- phase 1

const envPath = path.join(ROOT, '.env');
if (!existsSync(envPath)) {
  report('Environment file found', false);
  printResults('CLASS 06 ENVIRONMENT CHECK');
  console.log('FAIL: There is no .env file yet.\n');
  console.log('Possible causes:');
  console.log('- You have not created your local configuration.');
  console.log('\nNext actions:');
  console.log('1. Copy the example file:  cp .env.example .env  (macOS/Linux)');
  console.log('   or:  copy .env.example .env  (Windows cmd)');
  console.log('2. Paste your DATABASE_URL from the Supabase Connect dialog.');
  console.log('3. Generate a secret:  npm run generate:secret');
  console.log('\nRecovery guide: recovery/environment.md');
  process.exit(1);
}
report('Environment file found', true);

const { default: dotenv } = await import('dotenv');
dotenv.config({ path: envPath });

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((name) => !process.env[name]);
if (missing.length) {
  fail('Required variables found', {
    what: `The variable ${missing[0]} is empty or missing in .env.`,
    causes: ['.env was copied but not filled in.',
      'The variable name was changed or misspelled.'],
    inspect: ['Open .env and check every variable listed in .env.example.'],
    next: missing[0] === 'JWT_SECRET'
      ? 'Run: npm run generate:secret and paste the value into .env.'
      : 'Copy DATABASE_URL from the Supabase Connect dialog into .env.',
    recovery: 'recovery/environment.md'
  });
  printResults('CLASS 06 ENVIRONMENT CHECK');
  printFailure();
  process.exit(1);
}
report('Required variables found', true);

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 12000
});

try {
  await client.connect();
  report('Database connection established', true);
} catch (error) {
  fail('Database connection established', explainConnectionError(error));
  printResults('CLASS 06 ENVIRONMENT CHECK');
  printFailure();
  process.exit(1);
}

try {
  await client.query('SELECT 1');
  report('Database is reachable', true);
} catch (error) {
  fail('Database is reachable', explainConnectionError(error));
  printResults('CLASS 06 ENVIRONMENT CHECK');
  printFailure();
  await client.end();
  process.exit(1);
}

// ------------------------------------------------------ schema installed?

// Unqualified names resolve through the session's search_path, i.e. the very
// schema the application will use. Hardcoding 'public.' here would report the
// wrong answer whenever DATABASE_URL points the search_path elsewhere (this
// workshop lives in its own schema so it can share one Supabase project with
// the previous classes).
const ledger = await client.query(
  `SELECT to_regclass('schema_migrations') AS ledger,
          to_regclass('users') AS users,
          to_regclass('requests') AS requests,
          to_regclass('request_history') AS history`
);
const tables = ledger.rows[0];
const schemaInstalled = tables.users && tables.requests && tables.history;

if (!schemaInstalled) {
  let appOk = true;
  try {
    await import('../src/app.js');
  } catch {
    appOk = false;
  }
  report('Application configuration loaded', appOk);
  printResults('CLASS 06 ENVIRONMENT CHECK');
  if (!appOk) {
    console.log('The application failed to load. Check JWT_SECRET in .env.');
    console.log('Recovery guide: recovery/environment.md');
    await client.end();
    process.exit(1);
  }
  console.log('Database schema has not been installed yet.');
  console.log('Next command: npm run db:migrate');
  await client.end();
  process.exit(0);
}

// ---------------------------------------------------------------- phase 2

report('Migration table found', Boolean(tables.ledger));

const { readdirSync } = await import('node:fs');
const files = readdirSync(path.join(ROOT, 'database', 'migrations'))
  .filter((file) => file.endsWith('.sql'));
const appliedResult = tables.ledger
  ? await client.query('SELECT name FROM schema_migrations')
  : { rows: [] };
const applied = new Set(appliedResult.rows.map((row) => row.name));
const pending = files.filter((file) => !applied.has(file));
report('All migrations applied', pending.length === 0);

const seedUsers = await client.query(
  `SELECT count(*)::int AS n FROM users WHERE email LIKE '%.seed@example.test'`
);
report('Seed users found', seedUsers.rows[0].n >= 3);

const seedRequests = await client.query(
  `SELECT count(*)::int AS n FROM requests
   WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%.seed@example.test')`
);
report('Seed requests found', seedRequests.rows[0].n >= 4);

const history = await client.query('SELECT count(*)::int AS n FROM request_history');
report('Request history found', history.rows[0].n >= 4);

let appQueryOk = false;
try {
  await import('../src/app.js');
  const join = await client.query(
    `SELECT r.id FROM requests r JOIN users u ON u.id = r.created_by LIMIT 1`
  );
  appQueryOk = join.rows.length >= 0;
} catch {
  appQueryOk = false;
}
report('Application can query the database', appQueryOk);

await client.end();

// reorder: phase-2 layout per the class material
printResults('CLASS 06 ENVIRONMENT CHECK');

const allOk = results.every(([, ok]) => ok);
if (allOk && pending.length === 0 && seedUsers.rows[0].n >= 3) {
  console.log('Environment ready.');
  process.exit(0);
}

if (pending.length > 0) {
  console.log(`There are ${pending.length} pending migration(s).`);
  console.log('Next command: npm run db:migrate');
  console.log('Recovery guide: recovery/migrations.md');
} else if (seedUsers.rows[0].n < 3 || seedRequests.rows[0].n < 4) {
  console.log('The schema exists but the workshop data is missing or incomplete.');
  console.log('Next command: npm run db:seed');
  console.log('Recovery guide: recovery/seed.md');
} else {
  console.log('Something in the environment is not ready. Review the FAIL lines above.');
}
process.exit(1);
