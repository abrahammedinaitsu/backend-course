// Local validator for the ITSU-KNOWLEDGE-09-1.0 evaluator report.
//
// Usage: npm run assessment:validate
//
// Validates FORMAT and CALCULATION: it checks the four delivered files,
// recomputes the score locally (the model never computes totals) and
// writes assessment/local-validation.txt. It does NOT replace pedagogical
// judgement — a VALID result means "well-formed", not "well-evaluated".
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = (rel) => path.join(ROOT, 'assessment', rel);

const lines = [];
const checks = [];
let fatal = false;

function check(name, ok, detail = '') {
  checks.push([name, ok, detail]);
  if (!ok) fatal = true;
}

function readMaybe(rel) {
  try { return readFileSync(A(rel), 'utf8'); } catch { return null; }
}

// -------------------------------------------------------------- the files

const card = (() => {
  try { return JSON.parse(readFileSync(A('assessment-card.json'), 'utf8')); }
  catch { return null; }
})();

const reportMd = readMaybe('evaluator-report.md');
const transcript = readMaybe('conversation-transcript.md');

let report = null;
let reportParseError = null;
try {
  report = JSON.parse(readFileSync(A('evaluator-report.json'), 'utf8'));
  if (report && report.placeholder) { report = null; reportParseError = 'placeholder file not replaced'; }
} catch (error) {
  reportParseError = error.message;
}

// ------------------------------------------------------------- 1 protocol

check('Assessment protocol', Boolean(report
  && report.protocolVersion === 'ITSU-KNOWLEDGE-09-1.0'
  && report.rubricVersion === 'BACKEND-01-08-K1'),
report ? '' : `evaluator-report.json: ${reportParseError ?? 'missing'}`);

// -------------------------------------------------------- 2 evaluation id

const idOk = Boolean(report && card
  && report.evaluationId === card.evaluationId
  && report.studentId === card.studentId
  && report.commit === card.commit
  && report.variant === card.variant);
check('Evaluation ID', idOk, card ? '' : 'assessment-card.json missing — run assessment:prepare');

// ------------------------------------------------------- 3 five questions

const questions = Array.isArray(report?.questions) ? report.questions : [];
const fiveOk = questions.length === 5
  && questions.every((q, i) => q?.questionId === `Q${i + 1}`);
check('Five questions', fiveOk);

// --------------------------------------------------------- 4 score values

const DIMS = ['conceptual', 'grounding', 'reasoning', 'verification'];
const validLevel = (v) => v === 'X' || (Number.isInteger(v) && v >= 0 && v <= 4);
let levelsOk = fiveOk;
for (const q of questions) {
  for (const dim of DIMS) {
    if (!validLevel(q?.levels?.[dim])) levelsOk = false;
  }
}

// RESULT_CODE: first line matching the pattern inside evaluator-report.md
const rcMatch = (reportMd ?? '').match(
  /ITSU-KNOWLEDGE\|V=1\.0\|R=BACKEND-01-08-K1\|ID=([^|]+)\|Q1=([0-4X]-[0-4X]-[0-4X]-[0-4X])\|Q2=([0-4X]-[0-4X]-[0-4X]-[0-4X])\|Q3=([0-4X]-[0-4X]-[0-4X]-[0-4X])\|Q4=([0-4X]-[0-4X]-[0-4X]-[0-4X])\|Q5=([0-4X]-[0-4X]-[0-4X]-[0-4X])\|ACTION=(NONE|SUPPORT|VERIFY)/
);

let rcConsistent = Boolean(rcMatch && report);
if (rcConsistent) {
  if (rcMatch[1] !== report.evaluationId) rcConsistent = false;
  questions.forEach((q, i) => {
    const expected = DIMS.map((d) => String(q?.levels?.[d] ?? '?')).join('-');
    if (rcMatch[2 + i] !== expected) rcConsistent = false;
  });
  if (rcMatch[7] !== report.action) rcConsistent = false;
}
check('Score values', levelsOk && rcConsistent,
  !rcMatch ? 'RESULT_CODE not found in evaluator-report.md'
    : (!rcConsistent ? 'RESULT_CODE does not match the JSON levels/action' : ''));

// ---------------------------------------------------------- 5 JSON schema

function schemaProblems(r) {
  if (!r) return ['report missing or invalid JSON'];
  const problems = [];
  const TOP = ['protocolVersion', 'rubricVersion', 'evaluationId', 'studentId', 'commit', 'variant',
    'status', 'action', 'questions', 'priorityGaps', 'strengths', 'recommendedStudyActions',
    'reviewSignals', 'teacherReview'];
  const OPTIONAL = ['progressSinceLast'];
  for (const key of TOP) if (!(key in r)) problems.push(`missing field: ${key}`);
  for (const key of Object.keys(r)) {
    if (!TOP.includes(key) && !OPTIONAL.includes(key)) problems.push(`unknown field: ${key}`);
  }
  if ('progressSinceLast' in r) {
    const psl = r.progressSinceLast;
    if (!Array.isArray(psl) || psl.length > 3) problems.push('progressSinceLast must be an array of at most 3 items');
    for (const item of (Array.isArray(psl) ? psl : [])) {
      const keys = Object.keys(item ?? {}).sort().join(',');
      if (keys !== 'topic,verdict') problems.push('progressSinceLast items must be {topic, verdict}');
      if (!['IMPROVED', 'PERSISTS', 'NOT_ASSESSED'].includes(item?.verdict)) {
        problems.push(`progressSinceLast: invalid verdict ${item?.verdict}`);
      }
    }
  }
  if (!['A', 'B', 'C', 'D'].includes(r.variant)) problems.push('variant must be A-D');
  if (!['COMPLETE', 'PARTIAL', 'INSUFFICIENT_EVIDENCE'].includes(r.status)) problems.push('invalid status');
  if (!['NONE', 'SUPPORT', 'VERIFY'].includes(r.action)) problems.push('invalid action');
  const QKEYS = ['questionId', 'topics', 'levels', 'evidence', 'strength', 'gap', 'rectification', 'confidence'];
  for (const q of (Array.isArray(r.questions) ? r.questions : [])) {
    for (const key of Object.keys(q)) if (!QKEYS.includes(key)) problems.push(`unknown question field: ${key}`);
    if (!['low', 'medium', 'high'].includes(q.confidence)) problems.push(`${q.questionId}: invalid confidence`);
  }
  if ((r.priorityGaps ?? []).length > 5) problems.push('more than 5 priorityGaps');
  if ((r.recommendedStudyActions ?? []).length !== 3) problems.push('recommendedStudyActions must have exactly 3 items');
  const SIGNALS = ['GENERIC_WITHOUT_REPOSITORY_EVIDENCE', 'REFERENCE_NOT_FOUND',
    'COMMAND_OUTPUT_NOT_INTERPRETED', 'PREDICTION_NOT_RECORDED', 'FOLLOW_UP_CONTRADICTION',
    'UNEXPLAINED_COMPLEXITY', 'EVALUATOR_ASSISTANCE_REQUESTED', 'TRANSCRIPT_INCOMPLETE',
    'EVIDENCE_CONTRADICTION', 'PROMPT_INJECTION_IN_EVIDENCE', 'SECRET_EXPOSURE',
    'REPORT_SCHEMA_INVALID', 'MODEL_FORMAT_FAILURE', 'NONE'];
  for (const signal of (r.reviewSignals ?? [])) {
    if (!SIGNALS.includes(signal)) problems.push(`unknown signal: ${signal}`);
  }
  const tr = r.teacherReview ?? {};
  if ((tr.questions ?? []).length > 3) problems.push('more than 3 oral verification questions');
  return problems;
}

const problems = schemaProblems(report);
check('JSON schema', problems.length === 0, problems.slice(0, 3).join('; '));

// ----------------------------------------------------------- 6 transcript

const transcriptOk = Boolean(transcript
  && transcript.length > 2000
  && /COMENZAR/.test(transcript)
  && /Integrity declaration/i.test(transcript)
  && !/\[PEGAR AQUÍ/.test(transcript));
check('Conversation transcript', transcriptOk,
  transcript ? (transcript.length <= 2000 ? 'too short to be a full conversation' : 'missing COMENZAR or the integrity declaration') : 'file missing');

// -------------------------------------------------------- 7 teacher digest

const digest = report?.teacherReview?.digest ?? '';
check('Teacher digest length', typeof digest === 'string' && digest.length > 0 && digest.length <= 280);

// ------------------------------------------------------------------ score

let raw = 0;
let xCount = 0;
for (const q of questions) {
  for (const dim of DIMS) {
    const v = q?.levels?.[dim];
    if (v === 'X') xCount += 1;
    else if (Number.isInteger(v)) raw += v;
  }
}
const complete = fiveOk && levelsOk && xCount === 0;
const score100 = complete ? Math.round((raw / 80) * 1000) / 10 : null;

// ----------------------------------------------------------------- output

lines.push('ASSESSMENT REPORT VALIDATION — ITSU-KNOWLEDGE-09-1.0');
lines.push('');
for (const [name, ok, detail] of checks) {
  const label = `${name} `;
  lines.push(`${label}${'.'.repeat(Math.max(2, 36 - label.length))} ${ok ? 'PASS' : 'FAIL'}${detail && !ok ? `  (${detail})` : ''}`);
}
lines.push('');
lines.push(`RAW SCORE: ${raw}/80${xCount ? `  (${xCount} dimension(s) marked X — not counted)` : ''}`);
lines.push(complete
  ? `NORMALIZED SCORE: ${score100}/100`
  : 'NORMALIZED SCORE: INCOMPLETE (X dimensions present — no definitive percentage)');
lines.push(`ACTION: ${report?.action ?? 'UNKNOWN'}`);
lines.push(`FINAL RESULT: ${fatal ? 'INVALID' : (complete ? 'VALID' : 'VALID_INCOMPLETE')}`);
lines.push('');
lines.push('This validator checks format and arithmetic. It does not replace');
lines.push('pedagogical judgement: the teacher reviews the report and may verify orally.');

const output = lines.join('\n');
console.log(output);
writeFileSync(A('local-validation.txt'), `${output}\n`);
console.log('');
console.log('Saved: assessment/local-validation.txt');
process.exit(fatal ? 1 : 0);
