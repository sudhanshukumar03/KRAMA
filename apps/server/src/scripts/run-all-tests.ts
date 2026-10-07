import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';
import crypto from 'node:crypto';
import { validateIntegrationTargets } from '../testing/testEnvironment';

const integrationFiles = new Set(['concurrency.test.ts', 'document.test.ts', 'document_roles.test.ts', 'events.test.ts', 'live_execution.test.ts', 'completion_award.integration.test.ts', 'followup_repairs.integration.test.ts']);
const integration = process.argv.includes('--integration');
if (integration) validateIntegrationTargets(process.env);
const testEnv = integration ? {
  ...process.env, NODE_ENV: 'test', KRAMA_INTEGRATION_TEST: '1', KRAMA_TEST_RUN_ID: crypto.randomUUID(),
  KRAMA_PRIMARY_DATABASE_URL: process.env.DATABASE_URL, KRAMA_PRIMARY_REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.TEST_DATABASE_URL, REDIS_URL: process.env.TEST_REDIS_URL,
} : { ...process.env, NODE_ENV: 'test', DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test', REDIS_URL: 'redis://127.0.0.1:1/15' };

const testDir = join(__dirname, '..', '__tests__');
const testFiles = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.ts'))
  .filter(f => integration === integrationFiles.has(f))
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
      env: testEnv,
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
