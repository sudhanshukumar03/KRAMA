import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const testDir = join(__dirname, '..', '__tests__');
const testFiles = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

console.log(`Running ${testFiles.length} test suites sequentially...\n`);

let passedCount = 0;
let failedCount = 0;

for (const file of testFiles) {
  const filePath = join(testDir, file);
  console.log(`\n========================================`);
  console.log(`▶ Running: ${file}`);
  console.log(`========================================`);

  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', '--test', filePath],
    {
      stdio: 'inherit',
      cwd: join(__dirname, '..', '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      shell: true,
      timeout: 30000,
    }
  );

  if (result.status === 0) {
    passedCount++;
    console.log(`✔ ${file} passed`);
  } else {
    failedCount++;
    console.error(`✖ ${file} failed (exit code: ${result.status})`);
  }
}

console.log(`\n========================================`);
console.log(`Summary: ${passedCount} suites passed, ${failedCount} suites failed.`);
console.log(`========================================`);

process.exit(failedCount === 0 ? 0 : 1);
