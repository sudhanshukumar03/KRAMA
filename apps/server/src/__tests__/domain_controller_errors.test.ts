import { after, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
process.env.REDIS_URL = 'redis://127.0.0.1:1/15';
let habits: typeof import('../controllers/habit.controller');
let goals: typeof import('../controllers/goal.controller');
let habitService: typeof import('../services/habit.service').habitService;
let goalService: typeof import('../services/goal.service').goalService;
let auth: typeof import('../controllers/auth.controller');
let authService: typeof import('../services/auth.service').authService;
before(async () => {
  ({ habitService } = await import('../services/habit.service'));
  ({ goalService } = await import('../services/goal.service'));
  habits = await import('../controllers/habit.controller');
  goals = await import('../controllers/goal.controller');
  auth = await import('../controllers/auth.controller');
  ({ authService } = await import('../services/auth.service'));
});
after(async () => {
  mock.restoreAll();
  const { redisService } = await import('../services/redis.service');
  redisService.client.disconnect();
  const { prisma } = await import('../prisma'); await prisma.$disconnect();
  const pool = (globalThis as typeof globalThis & { pool?: { end(): Promise<void> } }).pool;
  await pool?.end();
});
const workspaceId = '00000000-0000-4000-8000-000000000001';
async function invoke(controller: (req: Request, res: Response) => Promise<unknown>, body: unknown = {}) {
  let status = 200; let payload: Record<string, unknown> = {};
  const res = { status(code: number) { status = code; return this; }, json(value: Record<string, unknown>) { payload = value; return this; } } as Response;
  const req = { headers: { 'x-workspace-id': workspaceId }, params: { id: 'entity' }, query: {}, body, cookies: {}, ip: '127.0.0.1', user: { id: 'unit-owner', sessionId: 'unit-session' }, get: () => 'Asia/Kolkata' } as unknown as Request;
  await controller(req, res); return { status, payload };
}
test('habit creation hides internal adapter details from the HTTP response', async () => {
  const stub = mock.method(habitService, 'createHabit', async () => { throw new Error('SELECT private_schema; postgres://private-password'); });
  try {
    const result = await invoke(habits.createHabit, { name: 'Read' });
    assert.equal(result.status, 500);
    assert.doesNotMatch(JSON.stringify(result.payload), /private_schema|private-password/);
    assert.equal(result.payload.message, 'Internal server error');
  } finally { stub.mock.restore(); }
});
test('goal and habit controllers handle non-Error rejections without rejecting again', async () => {
  const habitStub = mock.method(habitService, 'updateHabit', async () => { throw null; });
  const goalStub = mock.method(goalService, 'updateGoal', async () => { throw { message: 42 }; });
  try {
    assert.equal((await invoke(habits.updateHabit, { name: 'Read' })).status, 500);
    assert.equal((await invoke(goals.updateGoal, { title: 'Build' })).status, 500);
  } finally { habitStub.mock.restore(); goalStub.mock.restore(); }
});
test('goal and habit validation errors remain actionable', async () => {
  for (const [controller, body] of [[habits.createHabit, { name: '' }], [goals.createGoal, { title: '', type: 'yearly' }]] as const) {
    const result = await invoke(controller, body);
    assert.equal(result.status, 400);
    assert.ok(Array.isArray(result.payload.errors));
  }
});

test('authentication controllers contain malformed rejections and redact adapter failures', async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  const diagnostics: unknown[] = [];
  const consoleStub = mock.method(console, 'error', (...values) => { diagnostics.push(values); });
  const { logger } = await import('../utils/logger');
  const logStub = mock.method(logger, 'error', (...values) => { diagnostics.push(values); });
  try {
    for (const error of [null, new Error('private-password postgres://private-auth-input')]) {
      const stubs = [
        mock.method(authService, 'signup', async () => { throw error; }),
        mock.method(authService, 'login', async () => { throw error; }),
        mock.method(authService, 'changePassword', async () => { throw error; }),
      ];
      try {
        for (const controller of [auth.signup, auth.login, auth.changePassword]) {
          const result = await invoke(controller, { name: 'Unit owner', email: 'unit@example.invalid', password: 'valid-unit-password-123' });
          assert.equal(result.status, 500);
          assert.doesNotMatch(JSON.stringify(result.payload), /private-password|private-auth-input/);
        }
      } finally { stubs.forEach(stub => stub.mock.restore()); }
    }
    assert.doesNotMatch(JSON.stringify(diagnostics), /private-password|private-auth-input/);
    assert.equal((await invoke(auth.login, { email: 'invalid', password: '' })).status, 400);
  } finally {
    consoleStub.mock.restore(); logStub.mock.restore();
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
