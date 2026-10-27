// Assessment card generator — ITSU-KNOWLEDGE-09-1.0.
//
// Usage: npm run assessment:prepare -- --student=STU042
//
// Builds assessment/assessment-card.json: a deterministic, per-student
// variant plus the initial repository evidence the evaluator receives.
// It NEVER includes secrets: no .env values, no tokens, no hashes, no
// personal data beyond the academic identifier you pass in.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------- arguments

const arg = process.argv.find((a) => a.startsWith('--student=') || a.startsWith('--studentId='));
let studentId = (arg ? arg.slice(arg.indexOf('=') + 1) : '').trim();

// The course asks for your email as identifier. Only the part BEFORE the @
// becomes the studentId: the full address never travels into an AI chat.
const emailMatch = studentId.match(/^([A-Za-z0-9._+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/);
const fromEmail = Boolean(emailMatch);
if (fromEmail) {
  studentId = emailMatch[1].toLowerCase().replaceAll(/[.+]/g, '-').replace(/-+$/, '');
}

if (!studentId || !/^[A-Za-z0-9_-]{2,32}$/.test(studentId)) {
  console.error('Usage: npm run assessment:prepare -- --student=<CORREO_O_ID>');
  console.error('Pass your course email (carlos@dominio.com → id "carlos")');
  console.error('or an academic identifier (letters, numbers, - or _).');
  console.error('--studentId= also works as the flag name.');
  process.exit(1);
}

// ----------------------------------------------------------------- commit

function git(command) {
  try {
    return execSync(`git ${command}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

const commit = git('rev-parse --short HEAD') ?? 'nogit00';

// Git resolves upward from this folder, so when the starter lives inside the
// student's course repository (e.g. activities/class-09/), both the commit and
// everything below come from THEIR repo — whatever their folders are called.
const repoRoot = git('rev-parse --show-toplevel');

// ---------------------------------------------------------------- variant
// Deterministic: same student + same commit → same variant, always.

const VARIANTS = {
  A: {
    targetEndpoint: 'GET /requests/:id',
    traceTest: 'test/request-detail.test.js',
    diagnosticScenario: 'LOG-01',
    changeScenario: 'CHANGE-01'
  },
  B: {
    targetEndpoint: 'PATCH /requests/:id',
    traceTest: 'test/requests.test.js',
    diagnosticScenario: 'LOG-02',
    changeScenario: 'CHANGE-02'
  },
  C: {
    targetEndpoint: 'POST /requests/:id/claim',
    traceTest: 'test/requests-claim.test.js',
    diagnosticScenario: 'LOG-03',
    changeScenario: 'CHANGE-03'
  },
  D: {
    targetEndpoint: 'GET /requests/:id/history',
    traceTest: 'test/requests-history.test.js',
    diagnosticScenario: 'LOG-04',
    changeScenario: 'CHANGE-04'
  }
};

// Reduce the FULL digest (not a single byte: structured id sets can skew
// the low bits of one byte) so variants spread across the class.
const hex = createHash('sha256').update(`${studentId}:${commit}`).digest('hex');
const variantKey = ['A', 'B', 'C', 'D'][Number(BigInt(`0x${hex}`) % 4n)];
const variant = VARIANTS[variantKey];

// ------------------------------------------------- repository evidence
// A compact, secret-free snapshot the evaluator can ground questions in.

function listDir(rel) {
  try {
    return readdirSync(path.join(ROOT, rel))
      .filter((name) => !name.startsWith('.env'))
      .sort()
      .map((name) => `${rel}/${name}`);
  } catch {
    return [];
  }
}

const structure = [
  ...listDir('src'),
  ...listDir('src/middleware'),
  ...listDir('src/modules/auth'),
  ...listDir('src/modules/requests'),
  ...listDir('src/database'),
  ...listDir('database/migrations'),
  ...listDir('test'),
  ...listDir('scripts')
].filter((entry) => !/node_modules|\.env/.test(entry));

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Initial test evidence: ONLY the pure policy tests (they need no database,
// so this works before .env exists). Everything else is up to the student
// to run and share during the conversation.
let initialTests = 'NOT_RUN';
try {
  const out = execSync(
    'node --test test/request-policy.test.js test/request-access-policy.test.js',
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }
  ).toString();
  const pass = out.match(/# pass (\d+)/)?.[1] ?? '?';
  const todo = out.match(/# todo (\d+)/)?.[1] ?? '0';
  initialTests = `policy tests: ${pass} pass, ${todo} todo (run without a database)`;
} catch (error) {
  const out = `${error.stdout ?? ''}`;
  const pass = out.match(/# pass (\d+)/)?.[1];
  initialTests = pass
    ? `policy tests: ${pass} pass (run without a database)`
    : 'NOT_RUN (policy tests could not be executed on this machine)';
}

// ------------------------------------------------- course repository
// A secret-free look at the student's WHOLE course repo (same approach as the
// class-08 checkpoint): top-level layout, class folders wherever and however
// they are named, and whether a remote is configured (GitHub is the single
// source of truth for submissions).

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'build']);

// Everything lifted from student files goes through these before it can reach
// the card (same redactions as the class-08 evidence package).
const REDACTIONS = [
  [/postgres(ql)?:\/\/\S+/gi, '[REDACTED_CONNECTION_STRING]'],
  [/(https?:\/\/)[^\s/@:]+:[^\s@]+@/gi, '$1[REDACTED]@'],
  [/DATABASE_URL\s*=\s*\S+/gi, 'DATABASE_URL=[REDACTED]'],
  [/JWT_SECRET\s*=\s*\S+/gi, 'JWT_SECRET=[REDACTED]'],
  [/Bearer\s+[A-Za-z0-9._-]{15,}/g, 'Bearer [REDACTED_TOKEN]'],
  [/eyJ[A-Za-z0-9._-]{20,}/g, '[REDACTED_TOKEN]']
];

function redact(text) {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) out = out.replaceAll(pattern, replacement);
  return out;
}

let courseRepo = { detected: false };
if (repoRoot) {
  const topLevel = readdirSync(repoRoot, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort();
  // Class folders at depth 1-2, whatever naming the student chose.
  const classFolders = [];
  const stack = [[repoRoot, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const rel = path.relative(repoRoot, path.join(dir, entry.name));
      if (/^(class|clase)[-_ ]?\d{1,2}([-_.].*)?$/i.test(entry.name)) classFolders.push(rel);
      if (depth < 1) stack.push([path.join(dir, entry.name), depth + 1]);
    }
  }
  courseRepo = {
    detected: true,
    topLevel: topLevel.slice(0, 30),
    classFolders: classFolders.sort().slice(0, 20),
    remoteConfigured: git('remote get-url origin') !== null
  };
}

// --------------------------------------------- previous evaluation (class 8)
// Looks across the student's repo for the OUTPUTS of the class-08 evaluations
// (ITSU-PROGRESS checkpoint and ITSU-KNOWLEDGE-01-07 exam), wherever they were
// saved. Only concrete result lines match — prompt templates do not. This is a
// complement: the evaluator uses it to steer follow-ups and report progress,
// never to grade today's answers.

const RC_PROGRESS = /ITSU-PROGRESS\|V=1\.0\|R=BACKEND-01-07-R1\|STATUS=[A-Z_]+\|(?:C0[1-7]=[0-4X](?:-[0-4X]){3}\|){7}ACTION=(?:NONE|SUPPORT|VERIFY)/g;
const RC_KNOWLEDGE = /ITSU-KNOWLEDGE\|V=1\.0\|R=BACKEND-01-07-K1\|(?:C0[1-7]=[0-4X]\|){7}ACTION=(?:NONE|SUPPORT|VERIFY)/g;
const PROMPT_FILE = /^ITSU-(CHECKPOINT|KNOWLEDGE)-01-07-1\.0\.md$/;

let previousEvaluation = { found: false };
if (repoRoot) {
  const hits = { progress: [], knowledge: [] };
  const topics = [];
  const queue = [repoRoot];
  let visited = 0;
  while (queue.length && visited < 4000) {
    const dir = queue.pop();
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) queue.push(full);
        continue;
      }
      visited += 1;
      if (!/\.(md|txt|json)$/i.test(entry.name)) continue;
      if (PROMPT_FILE.test(entry.name)) continue; // shipped prompt templates
      if (entry.name === 'assessment-card.json') continue; // a previous card quotes these codes
      let text;
      try {
        if (statSync(full).size > 1024 * 1024) continue;
        text = readFileSync(full, 'utf8');
      } catch { continue; }
      const mtime = statSync(full).mtimeMs;
      // Last match per file: in an exported transcript the real result comes
      // after any example embedded in the pasted prompt.
      const prog = text.match(RC_PROGRESS);
      if (prog) hits.progress.push({ code: prog[prog.length - 1], mtime });
      const know = text.match(RC_KNOWLEDGE);
      if (know) {
        hits.knowledge.push({ code: know[know.length - 1], mtime });
        const rt = [...text.matchAll(/"reviewTopics"\s*:\s*\[([^\]]*)\]/g)].pop();
        if (rt) {
          for (const m of rt[1].matchAll(/"([^"]{3,120})"/g)) topics.push({ topic: m[1], mtime });
        }
      }
    }
  }
  const latest = (list) => list.sort((a, b) => b.mtime - a.mtime)[0]?.code ?? null;
  const checkpoint = latest(hits.progress);
  const knowledge = latest(hits.knowledge);
  if (checkpoint || knowledge) {
    const newest = Math.max(...topics.map((t) => t.mtime), 0);
    previousEvaluation = {
      found: true,
      resultCodes: {
        checkpoint: checkpoint ? redact(checkpoint) : null,
        knowledge: knowledge ? redact(knowledge) : null
      },
      reviewTopics: [...new Set(
        topics.filter((t) => t.mtime === newest).map((t) => redact(t.topic))
      )].slice(0, 3)
    };
  }
}

// ------------------------------------------------------------------ card

const card = {
  protocolVersion: 'ITSU-KNOWLEDGE-09-1.0',
  evaluationId: `K09-${studentId}-${commit}`,
  studentId,
  commit,
  variant: variantKey,
  targetEndpoint: variant.targetEndpoint,
  traceTest: variant.traceTest,
  diagnosticScenario: variant.diagnosticScenario,
  changeScenario: variant.changeScenario,
  startedAt: new Date().toISOString(),
  repository: {
    structure,
    scripts: Object.keys(pkg.scripts).sort(),
    initialTests
  },
  courseRepo,
  previousEvaluation
};

const target = path.join(ROOT, 'assessment', 'assessment-card.json');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(card, null, 2)}\n`);

console.log('ASSESSMENT CARD READY');
console.log('');
console.log(`evaluationId : ${card.evaluationId}`);
if (fromEmail) {
  console.log(`studentId    : ${studentId} (derived from your email — the full address never goes into the chat)`);
}
console.log(`variant      : ${card.variant} (${card.targetEndpoint})`);
console.log(`card         : assessment/assessment-card.json`);
console.log(`course repo  : ${courseRepo.detected
  ? `detected (${(courseRepo.classFolders ?? []).length} class folder(s))`
  : 'NOT detected — run this from inside your course repository'}`);
console.log(`class-08 eval: ${previousEvaluation.found
  ? 'found — the evaluator will revisit your previous review topics'
  : 'not found — no problem, nothing is penalized'}`);
if (courseRepo.detected && !courseRepo.remoteConfigured) {
  console.log('');
  console.log('ATENCIÓN: git remote -v shows no origin. Submissions live on YOUR');
  console.log('GitHub repository — configure the remote before the workshop.');
}
console.log('');
console.log('Next steps:');
console.log('1. Open assessment/evaluator-prompt.md and copy it COMPLETE.');
console.log('2. Paste it into a NEW conversation with your AI model.');
console.log('3. Replace the marker between BEGIN_CARD/END_CARD with this card.');
console.log('4. Write COMENZAR and answer the five questions with evidence.');
console.log('');
console.log('The card contains no secrets — review it anyway before pasting.');

if (!existsSync(path.join(ROOT, '.env'))) {
  console.log('');
  console.log('Note: .env is not configured yet. The assessment does not need it;');
  console.log('the workshop after the break does (npm run doctor will guide you).');
}
