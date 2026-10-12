import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import crypto from 'node:crypto';
import { request as httpRequest } from 'node:http';
import pg from 'pg';
import { validateIntegrationTargets } from '../testing/testEnvironment';

async function main() {
  validateIntegrationTargets(process.env);
  const reserve = createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = (reserve.address() as { port: number }).port;
  await new Promise<void>(resolve => reserve.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, NODE_ENV: 'production', PORT: String(port), DATABASE_URL: process.env.TEST_DATABASE_URL,
    REDIS_URL: process.env.TEST_REDIS_URL, JWT_SECRET: 'startup-smoke-test-secret-at-least-forty-eight-characters-long', KRAMA_TEST_RUN_ID: crypto.randomUUID(),
    GROQ_API_KEY: '', GEMINI_API_KEY: '', R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_BUCKET_NAME: '', R2_PUBLIC_URL: '', UNSPLASH_ACCESS_KEY: '',
    FRONTEND_URL: 'http://localhost:4188', CORS_ORIGIN: 'http://127.0.0.1:4188',
  } });
  // Consume logs without exposing records or credentials in CI output.
  child.stdout?.resume(); child.stderr?.resume();
  const base = `http://127.0.0.1:${port}`;
  const marker = `startup-${crypto.randomUUID()}`;
  let userId: string | undefined;
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) throw new Error('API exited before startup verification.');
      try { ready = (await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    check(ready, 'API health check timed out.');
    const signup = await fetch(`${base}/api/v1/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${marker}@example.invalid`, name: marker, password: crypto.randomBytes(24).toString('hex') }) });
    check(signup.status === 201, 'Authenticated startup signup failed.');
    const auth = await signup.json() as any;
    check(auth.user.email === `${marker}@example.invalid`, 'Startup fixture ownership failed.'); userId = auth.user.id;
    const rotated = await fetch(`${base}/api/v1/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: auth.refreshToken }) });
    check(rotated.ok, 'Session rotation failed.');
    const session = await rotated.json() as any;
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    const me = await fetch(`${base}/api/v1/auth/me`, { headers });
    check(me.ok && (await me.json() as any).user.id === userId, 'Rotated session authentication failed.');
    const capabilities = await fetch(`${base}/api/v1/upload/capabilities`, { headers });
    const capability = await capabilities.json() as any;
    check(capabilities.ok && capability.uploadAvailable === false && capability.unsplashAvailable === false, 'Unavailable upload capability is inaccurate.');
    const upload = await fetch(`${base}/api/v1/upload`, { method: 'POST', headers });
    check(upload.status === 503, 'Unconfigured upload did not fail clearly.');
    const config = await fetch(`${base}/api/v1/ai/config`, { headers: { ...headers, 'x-workspace-id': auth.user.memberships[0].workspaceId } });
    check(config.ok && (await config.json() as any).available === false, 'Unconfigured AI capability is inaccurate.');
    const preflight = await fetch(`${base}/api/v1/workspaces`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:4188', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,x-timezone,x-timezone-offset,x-workspace-id' } });
    check(preflight.ok && preflight.headers.get('access-control-allow-headers')?.includes('x-timezone-offset'), 'Timezone preflight failed.');
    for (const path of ['/api/v1/workspaces', '/socket.io/?EIO=4&transport=polling']) {
      for (const origin of ['http://localhost:4188', 'http://127.0.0.1:4188']) {
        const reply = await fetch(`${base}${path}`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } });
        check(reply.ok && reply.headers.get('access-control-allow-origin') === origin, 'Configured production origin rejected.');
      }
      for (const origin of ['http://localhost:4199', 'http://127.0.0.1:5173', 'https://unconfigured.example']) {
        const reply = await fetch(`${base}${path}`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } });
        check(!reply.headers.has('access-control-allow-origin'), 'Unconfigured production origin allowed.');
      }
    }
    const websocketStatus = (origin: string) => new Promise<number>((resolve, reject) => {
      const upgrade = httpRequest(`${base}/socket.io/?EIO=4&transport=websocket`, { headers: {
        Origin: origin, Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
      } });
      upgrade.on('upgrade', (_reply, socket) => { socket.destroy(); resolve(101); });
      upgrade.on('response', reply => { reply.resume(); resolve(reply.statusCode || 0); });
      upgrade.on('error', reject);
      upgrade.setTimeout(5000, () => upgrade.destroy(new Error('WebSocket origin check timed out.')));
      upgrade.end();
    });
    check(await websocketStatus('http://localhost:4188') === 101, 'Configured production WebSocket origin rejected.');
    check(await websocketStatus('http://localhost:4199') !== 101, 'Unconfigured production WebSocket origin allowed.');
    console.log('Startup smoke passed: health, signup, refresh, authenticated read, upload capability/503, AI availability, timezone preflight and production HTTP/polling/WebSocket origin isolation.');
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
    if (userId) {
      const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
      try {
        await client.connect();
        const owned = await client.query('SELECT id FROM "User" WHERE id=$1 AND email=$2', [userId, `${marker}@example.invalid`]);
        check(owned.rowCount === 1, 'Startup cleanup ownership check failed.');
        await client.query('DELETE FROM "Workspace" WHERE "createdBy"=$1', [userId]);
        await client.query('DELETE FROM "User" WHERE id=$1', [userId]);
      } finally { await client.end(); }
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
