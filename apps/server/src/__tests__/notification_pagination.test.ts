import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';

describe('Notification history and unread totals', () => {
  let controller: typeof import('../controllers/notification.controller');
  let prisma: typeof import('../prisma').prisma;
  let original: { findMany: unknown; count: unknown; transaction: unknown };
  let records: any[] = [];
  let calls = 0;
  const matches = (record: any, where: any): boolean =>
    (!where.workspaceId || record.workspaceId === where.workspaceId) &&
    (!where.userId || record.userId === where.userId) &&
    (where.read === undefined || record.read === where.read) &&
    (!where.OR || where.OR.some((clause: any) =>
      clause.createdAt?.lt ? record.createdAt < clause.createdAt.lt
        : record.createdAt.getTime() === clause.createdAt.getTime() && record.id < clause.id.lt));
  before(async () => {
    controller = await import('../controllers/notification.controller');
    ({ prisma } = await import('../prisma'));
    original = { findMany: prisma.notification.findMany, count: prisma.notification.count, transaction: prisma.$transaction };
    (prisma.notification as any).findMany = async ({ where, orderBy, take }: any) => {
      calls++;
      assert.ok(where.workspaceId && where.userId, 'every page must be scoped to both user and workspace');
      assert.ok(orderBy);
      return records.filter(record => matches(record, where)).sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0, take);
    };
    (prisma.notification as any).count = async ({ where }: any) => {
      assert.equal(where.read, false);
      assert.ok(where.workspaceId && where.userId);
      return records.filter(record => matches(record, where)).length;
    };
    (prisma as any).$transaction = async (operations: any[], options: any) => {
      assert.equal(options.isolationLevel, 'RepeatableRead');
      return Promise.all(operations);
    };
  });
  after(async () => {
    (prisma.notification as any).findMany = original.findMany;
    (prisma.notification as any).count = original.count;
    (prisma as any).$transaction = original.transaction;
    await prisma.$disconnect();
  });
  const seed = () => {
    records = Array.from({ length: 51 }, (_, i) => ({ id: `notification-${String(51 - i).padStart(3, '0')}`, createdAt: new Date('2026-10-17T10:00:00Z'), userId: 'user-a', workspaceId: 'ws-a', read: i < 50 }));
    records.push({ ...records[0], id: 'foreign-user', userId: 'user-b', read: false });
    records.push({ ...records[0], id: 'foreign-workspace', workspaceId: 'ws-b', read: false });
    calls = 0;
  };
  async function request(query: any = { page: 'true' }, headers: any = { 'x-workspace-id': 'ws-a' }, user: any = { id: 'user-a' }) {
    let status = 200;
    let body: any;
    const res = { status: (value: number) => { status = value; return res; }, json: (value: any) => { body = value; return res; } };
    await controller.getNotifications({ headers, user, query } as any, res as any);
    return { status, body };
  }
  it('counts unread items outside the newest page and retrieves them through the cursor', async () => {
    seed();
    const first = await request();
    assert.equal(first.status, 200);
    assert.equal(first.body.items.length, 50);
    assert.ok(first.body.items.every((item: any) => item.read));
    assert.equal(first.body.unreadCount, 1);
    assert.ok(first.body.nextCursor);
    const second = await request({ page: 'true', cursor: first.body.nextCursor });
    assert.deepEqual(second.body.items.map((item: any) => item.id), ['notification-001']);
    assert.equal(second.body.nextCursor, null);
    assert.equal(second.body.unreadCount, 1);
    records.find(item => item.id === 'notification-001').read = true;
    assert.equal((await request()).body.unreadCount, 0);
  });
  it('keeps tied timestamps stable when new records arrive or the boundary row is removed', async () => {
    seed();
    const first = await request({ page: 'true', limit: '10' });
    const boundary = first.body.items.at(-1);
    records = records.filter(item => item.id !== boundary.id);
    records.push({ ...records[0], id: 'new-arrival', createdAt: new Date('2026-10-17T11:00:00Z') });
    const second = await request({ page: 'true', limit: '10', cursor: first.body.nextCursor });
    assert.deepEqual(second.body.items.map((item: any) => item.id), Array.from({ length: 10 }, (_, i) => `notification-${String(41 - i).padStart(3, '0')}`));
  });
  it('returns an empty page with zero unread when no owned items exist', async () => {
    seed();
    const result = await request({ page: 'true' }, { 'x-workspace-id': 'other-workspace' });
    assert.deepEqual(result.body, { items: [], unreadCount: 0, nextCursor: null });
  });
  it('preserves the existing array response for clients that do not request pagination', async () => {
    seed();
    const result = await request({});
    assert.equal(Array.isArray(result.body), true);
    assert.equal(result.body.length, 50);
    assert.ok(result.body.every((item: any) => item.userId === 'user-a' && item.workspaceId === 'ws-a'));
  });
  it('rejects invalid limits and cursors before querying records', async () => {
    seed();
    for (const limit of ['0', '101', 'NaN', '1.5']) assert.equal((await request({ page: 'true', limit })).status, 400);
    for (const cursor of ['not-json', ['bad'], Buffer.from(JSON.stringify({ id: 'a', createdAt: 'invalid' })).toString('base64url')]) {
      assert.equal((await request({ page: 'true', cursor })).status, 400);
    }
    assert.equal(calls, 0);
  });
  it('requires the active workspace and signed-in user', async () => {
    seed();
    assert.equal((await request({ page: 'true' }, {})).status, 400);
    assert.equal((await request({ page: 'true' }, { 'x-workspace-id': 'ws-a' }, null)).status, 401);
  });
});
