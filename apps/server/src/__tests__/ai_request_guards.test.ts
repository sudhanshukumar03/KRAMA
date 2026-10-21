import { before, after, afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
process.env.REDIS_URL = 'redis://127.0.0.1:1/15';
let ai: typeof import('../services/ai.service').aiService;
let redis: typeof import('../services/redis.service').redisService;
let controllers: typeof import('../controllers/ai.controller');
let prisma: typeof import('../prisma').prisma;
before(async () => {
  ({ aiService: ai } = await import('../services/ai.service'));
  ({ redisService: redis } = await import('../services/redis.service'));
  ({ prisma } = await import('../prisma'));
  controllers = await import('../controllers/ai.controller');
});
afterEach(() => mock.restoreAll());
after(async () => {
  redis.client.disconnect(); await prisma.$disconnect();
  await (globalThis as typeof globalThis & { pool?: { end(): Promise<void> } }).pool?.end();
});
async function invoke(handler: (req: Request, res: Response) => Promise<unknown>, body: unknown = {}, force = true) {
  let status = 200; let payload: unknown;
  const req = { workspaceId: 'authorized-scope', headers: { 'x-workspace-id': 'authorized-scope' }, query: force ? { force: 'true' } : {}, body, user: { id: 'guard-user' } } as unknown as Request;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } } as Response;
  await handler(req, res); return { status, payload };
}
function quotaStore() {
  const values = new Map<string, string>();
  mock.method(redis, 'get', async key => values.get(key) ?? null);
  mock.method(redis, 'set', async (key, value) => { values.set(key, value); });
  mock.method(redis, 'ensureConnected', async () => {});
  // Redis's atomic result is stubbed here; a real Redis integration case also
  // exercises the shipped reservation/release scripts concurrently.
  mock.method(redis.client, 'eval', async (_script, _keys, key, limit) => {
    const count = Number(values.get(String(key)) || 0);
    if (limit === undefined) { values.set(String(key), String(Math.max(0, count - 1))); return 1; }
    if (count >= Number(limit)) return 0;
    values.set(String(key), String(count + 1)); return 1;
  });
  return values;
}
test('parallel dashboard insight requests cannot exceed the three-generation daily quota', async () => {
  quotaStore(); let generated = 0;
  mock.method(ai, 'buildWorkspaceContext', async () => 'Synthetic context');
  mock.method(ai, 'complete', async () => { generated++; await Promise.resolve(); return 'A valid insight'; });
  const results = await Promise.all(Array.from({ length: 6 }, () => invoke(controllers.getDashboardInsight)));
  assert.equal(generated, 3);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 200, 200, 429, 429, 429]);
});
test('failed provider generation releases the reserved insight allowance', async () => {
  quotaStore(); let generated = 0;
  mock.method(ai, 'buildWorkspaceContext', async () => 'Synthetic context');
  mock.method(ai, 'complete', async () => { if (++generated === 1) throw new Error('Synthetic provider failure'); return 'A valid insight'; });
  assert.equal((await invoke(controllers.getDashboardInsight)).status, 500);
  for (let i = 0; i < 3; i++) assert.equal((await invoke(controllers.getDashboardInsight)).status, 200);
  assert.equal((await invoke(controllers.getDashboardInsight)).status, 429);
});

test('unavailable shared quota rejects generation before provider work', async () => {
  quotaStore(); let calls = 0;
  mock.method(redis, 'ensureConnected', async () => { throw new Error('Synthetic Redis outage'); });
  mock.method(ai, 'buildWorkspaceContext', async () => { calls++; return 'Synthetic context'; });
  mock.method(ai, 'complete', async () => { calls++; return 'A valid insight'; });
  const result = await invoke(controllers.getDashboardInsight);
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});

test('a cached insight needs no new provider call or quota reservation', async () => {
  const values = quotaStore(); let calls = 0;
  values.set('ai:dashboard_insight:authorized-scope', 'Saved insight');
  mock.method(redis, 'ensureConnected', async () => { throw new Error('No reservation expected'); });
  mock.method(ai, 'complete', async () => { calls++; return 'Unexpected generation'; });
  const result = await invoke(controllers.getDashboardInsight, {}, false);
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, { insight: 'Saved insight' });
  assert.equal(calls, 0);
});
test('malformed telemetry is rejected before context loading or provider work', async () => {
  let calls = 0;
  mock.method(ai, 'buildWorkspaceContext', async () => { calls++; return 'Synthetic context'; });
  mock.method(ai, 'complete', async () => { calls++; return 'A valid insight'; });
  for (const body of [null, { mood: {} }, { energy: [] }, { reflection: 'x'.repeat(20001) }, { sessionSeconds: -1 }, { sessionSeconds: 'invalid' }, { wins: -1 }, { wins: 1.5 }]) {
    assert.equal((await invoke(controllers.analyzeTelemetry, body)).status, 400);
  }
  assert.equal(calls, 0);
});
test('valid telemetry keeps zero values and uses the validated workspace scope', async () => {
  let scope = ''; let prompt = '';
  mock.method(ai, 'buildWorkspaceContext', async id => { scope = id; return 'Synthetic context'; });
  mock.method(ai, 'complete', async input => { prompt = input.prompt; return 'A valid insight'; });
  assert.equal((await invoke(controllers.analyzeTelemetry, { mood: 'calm', energy: 'steady', reflection: 'A focused day', sessionSeconds: 0, wins: 0 })).status, 200);
  assert.equal(scope, 'authorized-scope'); assert.match(prompt, /0 minutes/); assert.match(prompt, /Tasks Completed: 0/);
});
