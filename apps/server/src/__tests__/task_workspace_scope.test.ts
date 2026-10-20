import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import jwt from 'jwt-simple';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'task-scope-regression-secret-at-least-forty-eight-characters';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
process.env.REDIS_URL = 'redis://127.0.0.1:1/15';

describe('Task reordering workspace authorization', () => {
  const allowed = '00000000-0000-4000-8000-000000000001';
  const forbidden = '00000000-0000-4000-8000-000000000002';
  const writes: Array<{ workspaceId: string; data: any }> = [];
  const checked: string[] = [];
  let server: Server;
  let baseUrl: string;
  let token: string;
  let prisma: typeof import('../prisma').prisma;
  let redis: typeof import('../services/redis.service').redisService;
  let controller: typeof import('../controllers/task.controller').reorderTask;
  let originalSession: unknown, originalMembers: unknown;

  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ redisService: redis } = await import('../services/redis.service'));
    const { taskService } = await import('../services/task.service');
    ({ reorderTask: controller } = await import('../controllers/task.controller'));
    const { default: routes } = await import('../routes/task.routes');
    originalSession = prisma.session; originalMembers = prisma.workspaceMember;
    (prisma as any).session = { findUnique: async () => ({ userId: 'scope-user', revokedAt: null }) };
    (prisma as any).workspaceMember = {
      findFirst: async () => ({ workspaceId: allowed }),
      findUnique: async ({ where }: any) => {
        const id = where.userId_workspaceId.workspaceId;
        checked.push(id);
        return id === allowed ? { role: 'MEMBER' } : null;
      },
    };
    mock.method(redis, 'getShared', async () => null);
    mock.method(taskService, 'reorderTask', async (_id, workspaceId, data) => {
      writes.push({ workspaceId, data });
      return { id: 'task', workspaceId, position: data.position } as any;
    });
    token = jwt.encode({ sub: 'scope-user', sessionId: 'scope-session', exp: Math.floor(Date.now() / 1000) + 600 }, process.env.JWT_SECRET!, 'HS256');
    const app = express(); app.use(express.json()); app.use('/tasks', routes);
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  beforeEach(() => { writes.length = 0; checked.length = 0; });
  after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    mock.restoreAll();
    (prisma as any).session = originalSession; (prisma as any).workspaceMember = originalMembers;
    redis.client.disconnect(); await prisma.$disconnect(); await (globalThis as any).pool?.end();
  });

  function reorder(body: Record<string, unknown>, header?: string, query = '') {
    return fetch(baseUrl + '/tasks/task/reorder' + query, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(header ? { 'x-workspace-id': header } : {}) },
      body: JSON.stringify({ position: 10, version: 1, ...body }),
    });
  }

  it('rejects a body workspace different from the header before mutation', async () => {
    const response = await reorder({ workspaceId: forbidden }, allowed);
    assert.equal(response.status, 403); assert.equal(writes.length, 0);
  });
  it('rejects a body workspace different from the query before mutation', async () => {
    const response = await reorder({ workspaceId: forbidden }, undefined, '?workspaceId=' + allowed);
    assert.equal(response.status, 403); assert.equal(writes.length, 0);
  });
  it('checks membership when only a forbidden body workspace is supplied', async () => {
    const response = await reorder({ workspaceId: forbidden });
    assert.equal(response.status, 403); assert.deepEqual(checked, [forbidden]); assert.equal(writes.length, 0);
  });
  for (const source of ['header', 'body', 'fallback'] as const) {
    it(`uses the verified workspace with ${source} scope`, async () => {
      const response = await reorder(source === 'body' ? { workspaceId: allowed } : {}, source === 'header' ? allowed : undefined);
      assert.equal(response.status, 200); assert.deepEqual(checked, [allowed]);
      assert.equal(writes.length, 1); assert.equal(writes[0]?.workspaceId, allowed); assert.equal(writes[0]?.data.workspaceId, allowed);
    });
  }
  it('the controller uses middleware scope even if called with a conflicting body', async () => {
    let status = 200;
    const res: any = { status(value: number) { status = value; return this; }, json() { return this; } };
    await controller({ workspaceId: allowed, params: { id: 'task' }, body: { workspaceId: forbidden, position: 1, version: 1 }, user: { id: 'scope-user' } } as any, res);
    assert.equal(status, 200); assert.equal(writes[0]?.workspaceId, allowed); assert.equal(writes[0]?.data.workspaceId, allowed);
  });
});
