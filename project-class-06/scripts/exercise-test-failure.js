// Controlled failure exercise. Runs ONE isolated test that always fails,
// so you can practice READING a failure before you meet a real one.
// It does not touch the application, the database or your code.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'reading-a-failure.test.js'
);

console.log('READING A FAILURE — controlled exercise');
console.log('The next test FAILS on purpose. Your job is to read, not to fix.\n');

spawnSync(process.execPath, ['--test', fixture], { stdio: 'inherit' });

console.log('\n────────────────────────────────────────────');
console.log('Now answer (in your work-log.md):');
console.log('1. What is the NAME of the failing test?');
console.log('2. What value did it EXPECT?');
console.log('3. What value did it GET?');
console.log('4. In which FILE and LINE is the assertion?');
console.log('5. Did the failure happen in Prepare, Act or Check?');
console.log('6. Write ONE hypothesis before changing anything.');
console.log('\nRemember: red does not automatically mean the implementation');
console.log('is wrong — here, the simulated request forgot its auth header.');
