import { after, afterEach, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

describe('FUN-003: completed focus interval validation', () => {
  let completeFocusSession: typeof import('../controllers/focusSession.controller').completeFocusSession;
  let prisma: typeof import('../prisma').prisma;
  let redisService: typeof import('../services/redis.service').redisService;
  let socketService: typeof import('../services/socket.service').socketService;
  let originalSessions: typeof prisma.focusSession;
  let originalTransaction: typeof prisma.$transaction;
  before(async () => {
    ({ completeFocusSession } = await import('../controllers/focusSession.controller'));
    ({ prisma } = await import('../prisma'));
    ({ redisService } = await import('../services/redis.service'));
    ({ socketService } = await import('../services/socket.service'));
    originalSessions = prisma.focusSession;
    originalTransaction = prisma.$transaction;
  });
  afterEach(() => {
    mock.restoreAll();
    (prisma as any).focusSession = originalSessions;
    prisma.$transaction = originalTransaction;
  });
  after(async () => {
    redisService.client.disconnect(); await prisma.$disconnect();
    await (globalThis as any).pool?.end();
  });
  async function complete(duration: number, startTime: string, endTime: string) {
    let status = 200;
    let reads = 0;
    const session = { userId: 'user', workspaceId: 'workspace', duration, type: 'pomodoro', taskId: null, projectId: null, startTime: new Date(startTime), endTime: new Date(endTime) };
    (prisma as any).focusSession = { findUnique: async () => { reads++; return session; } };
    prisma.$transaction = (async () => { throw new Error('Unexpected write'); }) as any;
    mock.method(socketService, 'emitToUser', () => {});
    const res: any = { status(code: number) { status = code; return res; }, json() { return res; } };
    await completeFocusSession({ user: { id: 'user' }, workspaceId: 'workspace', body: { duration, startTime, endTime } } as any, res);
    return { status, reads };
  }
  it('rejects positive duration in an empty interval before database access', async () => {
    assert.deepEqual(await complete(1, '2026-01-01T12:00:00Z', '2026-01-01T12:00:00Z'), { status: 400, reads: 0 });
  });
  it('rejects a daily-cap-sized duration in a one-minute interval', async () => {
    assert.deepEqual(await complete(86400, '2026-01-01T12:00:00Z', '2026-01-01T12:01:00Z'), { status: 400, reads: 0 });
  });
  it('rejects completed sessions more than 30 seconds ahead of the server', async () => {
    const end = new Date(Date.now() + 60_000);
    assert.deepEqual(await complete(60, new Date(+end - 60_000).toISOString(), end.toISOString()), { status: 400, reads: 0 });
  });
  it('accepts offline historical sessions and paused work shorter than elapsed time', async () => {
    assert.deepEqual(await complete(300, '2026-01-01T12:00:00Z', '2026-01-01T12:10:00Z'), { status: 201, reads: 1 });
  });
  it('allows whole-second rounding for a partial second', async () => {
    assert.deepEqual(await complete(1, '2026-01-01T12:00:00Z', '2026-01-01T12:00:00.900Z'), { status: 201, reads: 1 });
  });
});
