// Progress package builder — cumulative checkpoint, classes 1-7.
// Builds activities/class-08/course-progress-evidence-01-07.md by scanning
// the student's course repository for KNOWN artifacts of each class.
//
// Honesty rules (they matter more than completeness):
//   FOUND         the file exists in the repository
//   NOT_FOUND     the expected artifact was not found
//   NOT_VERIFIED  a stored output (e.g. validation-evidence.txt) proves
//                 nothing about execution — it is text, not a run
//   EXECUTED_NOW  produced by THIS script right now (only git queries)
//
// Security: .env files, tokens, connection strings and anything that looks
// like a secret are excluded or redacted. The package must be safe to
// paste into any AI model.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMPT_VERSION = 'ITSU-CHECKPOINT-01-07-1.0';
const RUBRIC_VERSION = 'BACKEND-01-07-R1';

// ------------------------------------------------------------- repo root

function git(command, cwd) {
  try {
    return execSync(`git ${command}`, { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

const repoRoot = git('rev-parse --show-toplevel', PROJECT_ROOT) ?? PROJECT_ROOT;
const gitAvailable = repoRoot !== null && git('rev-parse HEAD', repoRoot) !== null;

// ------------------------------------------------------------- file walk

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'build']);
const TEXT_EXTS = new Set(['.md', '.txt']);
const MAX_FILES = 20000;

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length && files.length < MAX_FILES) {
    const dir = stack.pop();
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.name.startsWith('.env')) continue; // never, not even to list
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(full);
      } else {
        files.push(path.relative(root, full));
      }
    }
  }
  return files.sort();
}

const allFiles = walk(repoRoot);

// ------------------------------------------------------------- redaction

const REDACTIONS = [
  [/postgres(ql)?:\/\/\S+/gi, '[REDACTED_CONNECTION_STRING]'],
  [/(https?:\/\/)[^\s/@:]+:[^\s@]+@/gi, '$1[REDACTED]@'],
  [/DATABASE_URL\s*=\s*\S+/gi, 'DATABASE_URL=[REDACTED]'],
  [/JWT_SECRET\s*=\s*\S+/gi, 'JWT_SECRET=[REDACTED]'],
  [/Bearer\s+[A-Za-z0-9._-]{15,}/g, 'Bearer [REDACTED_TOKEN]'],
  [/eyJ[A-Za-z0-9._-]{20,}/g, '[REDACTED_TOKEN]'],
  [/scrypt\$\S+/g, '[REDACTED_HASH]'],
  [/\b[a-f0-9]{40,}\b/gi, '[REDACTED_HEX]'],
  [/(password|contraseña)\s*[:=]\s*[^\s"']+/gi, '$1: [REDACTED]'],
];

function redact(text) {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) out = out.replaceAll(pattern, replacement);
  return out;
}

function excerpt(relPath, maxLines = 30) {
  const full = path.join(repoRoot, relPath);
  try {
    if (statSync(full).size > 200 * 1024) return '[archivo demasiado grande para extracto]';
    const lines = readFileSync(full, 'utf8').split('\n');
    const head = lines.slice(0, maxLines).join('\n');
    const more = lines.length > maxLines ? `\n[... ${lines.length - maxLines} líneas más]` : '';
    return redact(head) + more;
  } catch {
    return '[no se pudo leer]';
  }
}

// ------------------------------------------------------------- per class

// Each class: substring matchers over repo paths + preferred excerpt files.
const CLASSES = [
  { id: '01', title: 'Fundamentos de backend',
    expect: ['class-01'],
    excerpts: [/class-01.*\.(md|txt)$/i] },
  { id: '02', title: 'HTTP y contratos',
    expect: ['class-02', 'http-contract'],
    excerpts: [/http-contract\.md$/i, /class-02.*\.(md|txt)$/i] },
  { id: '03', title: 'Recursos, estado y reglas',
    expect: ['class-03', 'resource-model', 'transition', 'test-matrix'],
    excerpts: [/resource-model\.md$/i, /class-03.*\.(md|txt)$/i] },
  { id: '04', title: 'PostgreSQL y persistencia',
    expect: ['class-04', 'migrations/', 'seed.js'],
    excerpts: [/class-04.*\.(md|txt)$/i] },
  { id: '05', title: 'Autenticación y autorización',
    expect: ['class-05', 'access-matrix', 'auth-contract', 'threat-cases', 'validate-class-05'],
    excerpts: [/auth-contract\.md$/i, /class-05.*evidence.*\.(md|txt)$/i] },
  { id: '06', title: 'Onboarding y pruebas',
    expect: ['class-06', 'work-log', 'BUG-106', 'FEATURE-206', 'validate-class-06'],
    excerpts: [/class-06.*work-log\.md$/i, /class-06.*validation-evidence\.txt$/i] },
  { id: '07', title: 'Diagnóstico y errores',
    expect: ['class-07', 'incident-report', 'error-handler', 'request-id', 'validate-class-07'],
    excerpts: [/class-07.*incident-report\.md$/i, /class-07.*validation-evidence\.txt$/i] },
];

const QUESTIONS = [
  ['01', 'Describe qué ocurre desde que una petición llega al backend hasta que sale una respuesta y explica por qué el servidor debe permanecer activo.'],
  ['02', 'Elige un endpoint del proyecto y explica cómo método, ruta, body y status forman su contrato.'],
  ['03', 'Explica, usando una solicitud del proyecto, la diferencia entre representación, dato inválido y transición incompatible con el estado actual.'],
  ['04', 'Explica la diferencia entre migración, seed y transacción, e indica dónde aparece cada concepto en el proyecto.'],
  ['05', 'Explica la diferencia entre autenticación y autorización y por qué un JWT decodificado todavía debe verificarse.'],
  ['06', 'Elige una prueba del proyecto, identifica preparación, acción y comprobación, y explica qué regresión protege.'],
  ['07', 'Describe un fallo investigado distinguiendo síntoma, hipótesis y causa; luego indica qué señal correspondería a health o readiness.'],
];

// ------------------------------------------------------------- build

const now = new Date().toISOString();
const head = gitAvailable ? git('rev-parse --short HEAD', repoRoot) : null;
const remoteUrl = gitAvailable ? git('remote get-url origin', repoRoot) : null;
const recentCommits = gitAvailable ? git('log --oneline -8', repoRoot) : null;

const out = [];
out.push('# course-progress-evidence-01-07');
out.push('');
out.push('Paquete de evidencia para el diagnóstico acumulativo 7 en 1.');
out.push('Generado automáticamente — completa las secciones marcadas con [COMPLETAR] antes de ejecutar el prompt.');
out.push('');
out.push('## Metadata');
out.push('');
out.push(`* studentId: ${process.env.STUDENT_ID ?? '[COMPLETAR — tu identificador de estudiante, sin datos personales extra]'}`);
out.push(`* promptVersion: ${PROMPT_VERSION}`);
out.push(`* rubricVersion: ${RUBRIC_VERSION}`);
out.push(`* generatedAt: ${now} (EXECUTED_NOW)`);
out.push(`* repoRoot: ${path.basename(repoRoot)}`);
out.push(`* commit: ${head ?? 'NOT_VERIFIED (git no disponible)'} ${head ? '(EXECUTED_NOW)' : ''}`);
out.push(remoteUrl
  ? `* repositorioRemoto: ${redact(remoteUrl)} (EXECUTED_NOW) — verifica que sea TU repositorio antes de continuar`
  : '* repositorioRemoto: [ATENCIÓN] este clone no tiene remoto configurado. En computadoras compartidas, confirma con `git remote -v` que estás sobre TU repositorio antes de generar evidencia.');
out.push('* modeloUtilizado: [COMPLETAR después de ejecutar el prompt]');
out.push('');
out.push('### Contexto de git (informativo, EXECUTED_NOW)');
out.push('');
out.push('El curso se trabaja en computadoras compartidas: el historial local puede');
out.push('estar incompleto o pertenecer a otra sesión sin que falte trabajo real.');
out.push('Este contexto NO es evidencia requerida — la evidencia son los archivos');
out.push('del repositorio remoto del estudiante y sus respuestas. La ausencia de');
out.push('commits aquí no debe interpretarse como evidencia faltante.');
out.push('');
if (recentCommits) {
  out.push('```text');
  out.push(redact(recentCommits));
  out.push('```');
  out.push('');
}

out.push('## Evidencia por clase');
out.push('');
out.push('Los archivos listados existen en el repositorio (FOUND). Un archivo de salida guardado, como validation-evidence.txt, es TEXTO: demuestra que se guardó, no que se ejecutó (NOT_VERIFIED como ejecución).');
out.push('');

for (const cls of CLASSES) {
  out.push(`### Clase ${cls.id} — ${cls.title}`);
  out.push('');
  const matches = allFiles.filter((file) =>
    cls.expect.some((needle) => file.toLowerCase().includes(needle.toLowerCase())));
  const shown = matches.slice(0, 12);
  if (shown.length) {
    for (const file of shown) {
      const stored = /validation-evidence|\.txt$/.test(file) ? ' — salida guardada, NOT_VERIFIED como ejecución' : '';
      out.push(`* FOUND: ${file}${stored}`);
    }
    if (matches.length > shown.length) out.push(`* … ${matches.length - shown.length} archivo(s) más con el mismo patrón`);
  } else {
    out.push('* NOT_FOUND: ningún artefacto esperado de esta clase');
  }
  // excerpts
  let excerptCount = 0;
  for (const pattern of cls.excerpts) {
    if (excerptCount >= 2) break;
    const file = matches.find((f) => pattern.test(f));
    if (!file) continue;
    excerptCount += 1;
    out.push('');
    out.push(`Extracto de ${file} (redactado automáticamente):`);
    out.push('');
    out.push('```text');
    out.push(excerpt(file));
    out.push('```');
  }
  out.push('');
}

out.push('## Estado previo a la clase 8');
out.push('');
const validators = allFiles.filter((f) => /validate-class-0[1-7]\.js$/.test(f));
const testDirs = [...new Set(allFiles.filter((f) => /(^|\/)test\/.+\.test\.js$/.test(f))
  .map((f) => f.slice(0, f.indexOf('/test/') + 5)))];
out.push(`* Validadores disponibles (clases 1-7): ${validators.length ? validators.join(', ') : 'NOT_FOUND'}`);
out.push(`* Carpetas de pruebas: ${testDirs.length ? testDirs.join(', ') : 'NOT_FOUND'}`);
out.push(`* Último commit antes del taller: ${head ?? 'NOT_VERIFIED'}`);
out.push('');

out.push('## Cuestionario diagnóstico (responde aquí, 3-6 líneas cada una)');
out.push('');
out.push('Sé específico: cita archivos o rutas concretas de TU proyecto cuando puedas. La extensión no suma.');
out.push('');
for (const [id, question] of QUESTIONS) {
  out.push(`### Pregunta clase ${id}`);
  out.push('');
  out.push(question);
  out.push('');
  out.push('Respuesta: [COMPLETAR]');
  out.push('');
}

out.push('---');
out.push('Nota de seguridad: este paquete fue generado excluyendo .env y redactando');
out.push('posibles secretos. Revisa una vez más antes de pegarlo en un modelo:');
out.push('si ves una credencial real, reemplázala por [REDACTED] y avisa al docente.');
out.push('');

const target = path.join(PROJECT_ROOT, 'activities', 'class-08', 'course-progress-evidence-01-07.md');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, out.join('\n'));

console.log('PROGRESS PACKAGE');
console.log('');
console.log(`Repositorio analizado: ${repoRoot}`);
console.log(remoteUrl
  ? `Remoto configurado: ${redact(remoteUrl)} — confirma que es TU repositorio.`
  : 'ATENCIÓN: sin remoto configurado. Verifica con `git remote -v` que este clone es tuyo.');
console.log(`Archivos inspeccionados: ${allFiles.length}`);
console.log(`Paquete generado: ${path.relative(process.cwd(), target)}`);
console.log('');
console.log('Siguientes pasos:');
console.log('1. Abre el paquete y completa studentId y las 7 respuestas [COMPLETAR].');
console.log('2. Copia el prompt de self-evaluation/ITSU-CHECKPOINT-01-07-1.0.md.');
console.log('3. Pega prompt + paquete en UNA sola conversación con el modelo.');
console.log('4. Guarda RESULT_CODE, JSON y reporte en activities/class-08/ai-self-evaluation-01-07.md.');
console.log('5. Al terminar cada bloque del taller: git add -A && git commit && git push.');
console.log('   Lo que no está en TU repositorio remoto no existe para la evaluación.');
