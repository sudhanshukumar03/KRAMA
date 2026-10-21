import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdirSync, createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { validateIntegrationTargets } from '../../apps/server/src/testing/testEnvironment';

const root = resolve(__dirname, '../..');
const server = resolve(root, 'apps/server');
const requireServer = createRequire(resolve(server, 'package.json'));
requireServer('dotenv').config({ path: resolve(server, '.env'), quiet: true });
const mode = process.argv[2] || 'core';
if (!['core','ai','mobile','baseline','scale','contracts'].includes(mode)) throw new Error('Choose core, ai, mobile, baseline, scale or contracts verification.');
const textProvider = process.argv[3] || 'auto';
if (!['auto','groq','gemini'].includes(textProvider)) throw new Error('Choose auto, groq or gemini text verification.');
const primary = { ...process.env };
if (mode === 'ai' && (!primary.GEMINI_API_KEY || !(primary.GROQ_API_KEY || primary.GEMINI_API_KEY))) throw new Error('Real AI verification requires a configured embedding and text provider.');
function origin(value: string) { try { return new URL(value); } catch { throw new Error('Set valid local verification origins.'); } }
const api = origin(primary.KRAMA_API_TARGET || 'http://127.0.0.1:3021');
const frontend = origin(primary.KRAMA_LIVE_FRONTEND_URL || 'http://127.0.0.1:4189');
for (const url of [api, frontend]) if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw new Error('Verification services must use local HTTP origins.');
const env: NodeJS.ProcessEnv = { ...primary, DATABASE_URL: primary.TEST_DATABASE_URL, REDIS_URL: primary.TEST_REDIS_URL,
  KRAMA_PRIMARY_DATABASE_URL: primary.DATABASE_URL, KRAMA_PRIMARY_REDIS_URL: primary.REDIS_URL,
  NODE_ENV: 'test', KRAMA_INTEGRATION_TEST: '1', KRAMA_TEST_RUN_ID: randomUUID(),
  PORT: api.port, KRAMA_API_TARGET: api.origin, KRAMA_LIVE_FRONTEND_URL: frontend.origin, FRONTEND_URL: frontend.origin,
  COOKIE_SECURE: 'false', AUTH_RATE_LIMIT_MAX: '10000', REFRESH_RATE_LIMIT_MAX: '10000',
  KRAMA_PRODUCTION_VERIFY: '', KRAMA_VERIFY_MODE: mode, KRAMA_AI_VERIFY: mode === 'ai' ? '1' : '0',
  KRAMA_QUALITY_BASELINE: mode === 'baseline' ? '1' : '0',
  KRAMA_QUALITY_SCALE: mode === 'scale' ? '1' : '0',
  KRAMA_LIVE_VERIFY: '1', KRAMA_EXECUTION_BOARD_VERIFY: '1', KRAMA_GOALS_HABITS_VERIFY: '1', KRAMA_PROJECTS_VERIFY: '1',
  KRAMA_UI_RESTORATION_VERIFY: '1', KRAMA_DASHBOARD_VERIFY: '1', KRAMA_CROSS_SECTION_VERIFY: '1',
};
delete env.NO_COLOR;
for (const key of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_PUBLIC_URL','UNSPLASH_ACCESS_KEY','CALENDARIFIC_API_KEY']) env[key] = '';
if (mode !== 'ai') for (const key of ['GEMINI_API_KEY','GROQ_API_KEY']) env[key] = '';
if (mode === 'ai' && textProvider === 'gemini') env.GROQ_API_KEY = '';
if (mode === 'ai' && textProvider === 'groq' && !env.GROQ_API_KEY) throw new Error('Groq verification requires its configured key.');
const secrets = ['JWT_SECRET','GEMINI_API_KEY','GROQ_API_KEY','DATABASE_URL','REDIS_URL','TEST_DATABASE_URL','TEST_REDIS_URL'].map(key => primary[key]).filter(Boolean) as string[];
const redact = (text: string) => secrets.reduce((result, secret) => result.replaceAll(secret, '[redacted]'), text);
const logs = resolve(root, 'test-results/services', mode); mkdirSync(logs, { recursive: true });
const children: ChildProcess[] = [];
function start(args: string[], cwd: string, processEnv: NodeJS.ProcessEnv, logName?: string) {
  const child = spawn(process.execPath, args, { cwd, env: processEnv, stdio: logName ? ['ignore','pipe','pipe'] : 'inherit', windowsHide: true });
  children.push(child);
  if (logName) { const output = createWriteStream(resolve(logs, logName)); for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => output.write(redact(String(chunk)))); child.once('close', () => output.end()); }
  return child;
}
const finished = (child: ChildProcess) => new Promise<number>((done, reject) => { child.once('error', reject); child.once('exit', code => done(code ?? 1)); });
async function available(port: number) { const socket = createServer(); await new Promise<void>((done, reject) => { socket.once('error', reject); socket.listen(port, '127.0.0.1', done); }); await new Promise<void>(done => socket.close(() => done())); }
async function stop(child: ChildProcess) { if (child.exitCode !== null || child.signalCode !== null) return; const exited = new Promise<void>(done => child.once('exit', () => done())); child.kill('SIGTERM'); await Promise.race([exited, new Promise(done => setTimeout(done, 2000))]); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
async function main() {
  validateIntegrationTargets(primary);
  await available(Number(api.port)); await available(Number(frontend.port));
  const prepared = await finished(start(['--import','tsx','src/scripts/prepare-integration.ts'], server, primary));
  if (prepared) throw new Error('Could not prepare isolated verification storage.');
  const backend = start(['--import','tsx','src/index.ts'], server, env, 'api.log');
  const worker = start(['--import','tsx','src/worker.ts'], server, env, 'worker.log');
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (backend.exitCode !== null || worker.exitCode !== null) throw new Error('Verification service exited; inspect sanitized service logs.');
    try { ready = (await fetch(`${api.origin}/ready`, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break;
    await new Promise(done => setTimeout(done, 250));
  }
  if (!ready) throw new Error('Verification API readiness timed out.');
  const cli = createRequire(resolve(root, 'package.json')).resolve('@playwright/test/cli');
  process.exitCode = await finished(start([cli,'test','--config','playwright.live.config.ts'], root, env));
}
const cleanup = async () => { for (const child of children.slice().reverse()) await stop(child); };
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => { void cleanup().then(() => { process.exitCode = 130; }); });
main().catch(error => { console.error(redact(error.message)); process.exitCode = 1; }).finally(cleanup);
