import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { validateIntegrationTargets } from '../testing/testEnvironment';

async function main() {
  const { database } = validateIntegrationTargets(process.env);
  const databaseName = database.pathname.slice(1);
  const adminUrl = new URL(database);
  adminUrl.pathname = '/postgres';
  const client = new pg.Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (!existing.rowCount) await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally { await client.end(); }
  const result = spawnSync(process.execPath, [join(dirname(createRequire(__filename).resolve('prisma/package.json')), 'build/index.js'), 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }, stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('Test database migration failed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
