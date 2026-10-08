import { after, afterEach, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

describe('SEC-002: workspace socket content authorization', () => {
  let prisma: typeof import('../prisma').prisma;
  let redisService: typeof import('../services/redis.service').redisService;
  let socketService: typeof import('../services/socket.service').socketService;
  let originalMembers: typeof prisma.workspaceMember;
  const delivered: { rooms: string[]; event: string; data: unknown }[] = [];
  const members = [
    { userId: 'owner', role: 'OWNER', workspaceId: 'workspace', deleted: false },
    { userId: 'admin', role: 'ADMIN', workspaceId: 'workspace', deleted: false },
    { userId: 'member', role: 'MEMBER', workspaceId: 'workspace', deleted: false },
    { userId: 'viewer', role: 'VIEWER', workspaceId: 'workspace', deleted: false },
    { userId: 'guest', role: 'GUEST', workspaceId: 'workspace', deleted: false },
    { userId: 'outsider', role: 'OWNER', workspaceId: 'another-workspace', deleted: false },
    { userId: 'deleted', role: 'OWNER', workspaceId: 'workspace', deleted: true },
  ];
  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ redisService } = await import('../services/redis.service'));
    ({ socketService } = await import('../services/socket.service'));
    originalMembers = prisma.workspaceMember;
  });
  afterEach(() => { mock.restoreAll(); (prisma as any).workspaceMember = originalMembers; delivered.length = 0; (socketService as any).io = null; });
  after(async () => {
    redisService.client.disconnect();
    await prisma.$disconnect();
    await (globalThis as any).pool?.end();
  });
  function capture(active = members) {
    (prisma as any).workspaceMember = { findMany: async (query: any) => {
      assert.equal(query.where.workspace.deletedAt, null);
      return active.filter(m => m.workspaceId === query.where.workspaceId && !m.deleted && query.where.role.in.includes(m.role)) as any;
    } };
    (socketService as any).io = { to(rooms: string[]) {
      return { emit(event: string, data: unknown) { delivered.push({ rooms, event, data }); } };
    } };
  }
  async function emit() {
    socketService.emitToWorkspace('workspace', 'task:updated', { taskId: 'task' });
    await new Promise<void>(resolve => setImmediate(resolve));
  }
  it('delivers to OWNER/ADMIN/MEMBER/VIEWER, excluding guests, outsiders and deleted workspaces', async () => {
    capture(); await emit();
    assert.deepEqual(delivered[0]?.rooms, ['owner', 'admin', 'member', 'viewer']);
  });
  it('rechecks membership after a role downgrade or removal', async () => {
    const active = members.map(m => ({ ...m }));
    capture(active); await emit();
    active.find(m => m.userId === 'viewer')!.role = 'GUEST';
    active.splice(active.findIndex(m => m.userId === 'member'), 1);
    await emit();
    assert.deepEqual(delivered[1]?.rooms, ['owner', 'admin']);
  });
  it('withholds workspace events if authorization storage is unavailable', async () => {
    capture();
    mock.method(prisma.workspaceMember, 'findMany', async () => { throw new Error('Database unavailable'); });
    mock.method(console, 'warn', () => {});
    await emit();
    assert.equal(delivered.length, 0);
  });
});
