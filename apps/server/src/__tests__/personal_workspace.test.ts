import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
const source = JSON.parse(readFileSync(resolve(__dirname, '../../../../e2e/fixtures/personal-backup.json'), 'utf8'));
const userId = '00000000-0000-0000-0000-000000000200';

describe('Personal workspace restoration', () => {
  let restore: typeof import('../services/workspaceRestore.service');
  let prisma: typeof import('../prisma').prisma;
  let originalTransaction: unknown;
  before(async () => {
    restore = await import('../services/workspaceRestore.service');
    ({ prisma } = await import('../prisma'));
    originalTransaction = prisma.$transaction;
  });
  after(async () => { (prisma as any).$transaction = originalTransaction; await prisma.$disconnect(); });

  it('remaps the complete backup graph, history, trash and internal document links into new IDs', () => {
    const plan = restore.prepareWorkspaceRestore(source, userId);
    const rows = plan.rows;
    assert.notEqual(plan.workspaceId, source.workspace.id);
    assert.equal(rows.workspace[0]!.name, 'Personal (restored)');
    const task = rows.task.find(row => row.title === 'Study chapter 3')!;
    assert.equal(task.workspaceId, plan.workspaceId);
    assert.equal(task.assigneeId, userId);
    assert.equal(task.metadata.inbox, true);
    assert.equal(rows.comment[0]!.taskId, task.id);
    assert.equal(rows.documentTag[0]!.documentId, rows.document[0]!.id);
    assert.equal(rows.labelsOnTasks[0]!.labelId, rows.label[0]!.id);
    assert.ok(rows.document[1]!.deletedAt instanceof Date);
    assert.ok(rows.document[0]!.contentMarkdown.includes(task.id));
    assert.ok(JSON.stringify(rows.document[0]!.contentJson).includes(task.id));
    assert.equal(rows.dailyLog[0]!.metadata.personalDay.taskIds[0], task.id);
    assert.equal(rows.dailyLog[0]!.metadata.personalDay.decisions[task.id].action, 'tomorrow');
    assert.equal(rows.notification[0]!.actionUrl, '/app/board?task=' + task.id);
    assert.equal(rows.entityLink[0]!.targetId, task.id);
    assert.equal(rows.activityLog[0]!.entityId, task.id);
    assert.equal(rows.focusSession[0]!.userId, userId);
    assert.equal(plan.patches.find(patch => patch.model === 'task')!.data.blockedById, rows.task[1]!.id);
    assert.equal(rows.timeBlock[0]!.type, 'STUDY');
    assert.equal(rows.timeBlock[0]!.syncStatus, 'LOCAL_ONLY');
  });
  it('remaps the habit snapshot user when importing a personal backup', () => {
    const backup = structuredClone(source);
    backup.workspace.habits[0].metadata = { ...backup.workspace.habits[0].metadata, streakUserId: backup.workspace.members[0].user.id };
    const plan = restore.prepareWorkspaceRestore(backup, userId);
    assert.equal(plan.rows.habit[0]!.metadata.streakUserId, userId);
  });

  for (const corruption of ['workspace', 'missing reference', 'duplicate', 'cycle', 'foreign user', 'members', 'version'] as const) {
    it(`rejects ${corruption} corruption before touching storage`, () => {
      const backup = structuredClone(source);
      if (corruption === 'workspace') backup.workspace.tasks[0].workspaceId = 'another-workspace';
      if (corruption === 'missing reference') backup.workspace.tasks[0].projectId = 'missing-project';
      if (corruption === 'duplicate') backup.workspace.tasks.push(backup.workspace.tasks[0]);
      if (corruption === 'cycle') backup.workspace.tasks[1].blockedById = backup.workspace.tasks[0].id;
      if (corruption === 'foreign user') backup.workspace.habits[0].completions[0].userId = 'another-user';
      if (corruption === 'members') backup.workspace.members.push(backup.workspace.members[0]);
      if (corruption === 'version') backup.formatVersion = 1;
      assert.throws(() => restore.prepareWorkspaceRestore(backup, userId));
    });
  }

  it('never deserializes membership privileges, nested writes or account fields', () => {
    const backup = structuredClone(source);
    backup.workspace.passwordHash = 'must-not-import';
    backup.workspace.members[0].role = 'ADMIN';
    backup.workspace.tasks[0].workspace = { update: { name: 'must-not-update' } };
    const plan = restore.prepareWorkspaceRestore(backup, userId);
    assert.equal(plan.rows.workspace[0]!.passwordHash, undefined);
    assert.equal(plan.rows.workspace[0]!.members, undefined);
    assert.equal(plan.rows.task[0]!.workspace, undefined);
  });

  it('writes only fresh records in one transaction and creates a single current-user owner membership', async () => {
    const writes: Array<{ model: string; data: any }> = [];
    let commits = 0;
    (prisma as any).$transaction = async (callback: any) => {
      const tx = new Proxy({}, { get: (_, model: string) => model === '$executeRaw' ? async () => 0 : ({
        createMany: async ({ data }: any) => { writes.push({ model, data }); },
        update: async ({ data }: any) => { writes.push({ model: model + ':patch', data }); },
        create: async ({ data }: any) => { writes.push({ model, data }); },
        findUniqueOrThrow: async ({ where }: any) => ({ id: where.id, name: 'Personal (restored)' }),
      }) });
      const result = await callback(tx); commits++; return result;
    };
    const result = await restore.restoreWorkspaceBackup(source, userId);
    assert.equal(commits, 1);
    assert.notEqual(result.id, source.workspace.id);
    assert.deepEqual(writes.find(write => write.model === 'workspaceMember')!.data, { workspaceId: result.id, userId, role: 'OWNER' });
    assert.equal(writes.filter(write => write.model === 'workspace').length, 1);
    assert.ok(writes.findIndex(write => write.model === 'document') > writes.findIndex(write => write.model === 'space'));
  });
});

describe('Daily priorities and closing review', () => {
  let service: typeof import('../services/personalDay.service');
  let prisma: typeof import('../prisma').prisma;
  let originalTransaction: unknown;
  let tasks: any[];
  let log: any;
  let saved: any;
  let writes: any[];
  const ws = source.workspace.id;
  const day = '2026-10-15';
  before(async () => {
    service = await import('../services/personalDay.service');
    ({ prisma } = await import('../prisma'));
    originalTransaction = prisma.$transaction;
  });
  beforeEach(() => {
    tasks = structuredClone(source.workspace.tasks); log = { metadata: { otherSetting: 'keep me', personalDay: { taskIds: [tasks[0].id] } } }; writes = []; saved = null;
    (prisma as any).$transaction = async (callback: any) => callback({
      $queryRaw: async () => [],
      dailyLog: {
        findUnique: async ({ where }: any) => { assert.equal(where.userId_workspaceId_date.workspaceId, ws); assert.equal(where.userId_workspaceId_date.userId, userId); return log; },
        upsert: async (args: any) => { saved = args; return { ...args.update, version: (log?.version || 0) + 1 }; },
      },
      task: {
        findMany: async ({ where }: any) => tasks.filter(task => where.id.in.includes(task.id) && task.workspaceId === where.workspaceId && task.status !== 'CANCELED'),
        findFirst: async ({ where }: any) => tasks.find(task => task.id === where.id && task.workspaceId === where.workspaceId) || null,
        update: async (args: any) => { writes.push(args); return { ...tasks[0], ...args.data }; },
      },
      activityLog: { create: async () => ({}) },
    });
  });
  after(async () => { (prisma as any).$transaction = originalTransaction; await prisma.$disconnect(); });

  it('keeps priorities personal, dated and limited to three valid tasks', async () => {
    const ids = tasks.map(task => task.id);
    assert.deepEqual((await service.savePersonalDay(ws, userId, day, { taskIds: ids })).taskIds, ids);
    assert.equal(saved.update.metadata.otherSetting, 'keep me');
    await assert.rejects(service.savePersonalDay(ws, userId, day, { taskIds: [ids[0], ids[0]] }), /different tasks/);
    await assert.rejects(service.savePersonalDay(ws, userId, day, { taskIds: [...ids, 'extra-1', 'extra-2'] }), /three/);
    await assert.rejects(service.savePersonalDay(ws, userId, day, { taskIds: ['foreign-task'] }), /this workspace/);
    await assert.rejects(service.savePersonalDay(ws, userId, '2026-02-30', { taskIds: [] }), /valid date/);
  });

  for (const action of ['tomorrow', 'backlog', 'cancel'] as const) {
    it(`${action} review updates the task and daily decision atomically without changing the deadline`, async () => {
      const task = tasks[0]; task.dueDate = '2026-10-15T12:00:00.000Z';
      const result = await service.savePersonalDay(ws, userId, day, { review: { taskId: task.id, version: task.version, action } });
      assert.equal(writes.length, 1);
      assert.equal(writes[0].where.workspaceId, ws);
      assert.equal(writes[0].where.version, task.version);
      assert.equal(writes[0].data.dueDate, undefined);
      assert.equal(writes[0].data.metadata.inbox, false);
      assert.equal(writes[0].data.status, action === 'tomorrow' ? 'TODO' : action === 'backlog' ? 'BACKLOG' : 'CANCELED');
      assert.equal(writes[0].data.scheduledDate?.toISOString() || null, action === 'tomorrow' ? '2026-10-16T12:00:00.000Z' : null);
      assert.deepEqual(result.taskIds, []);
      assert.equal(saved.update.metadata.personalDay.decisions[task.id].action, action);
    });
  }
  it('rejects stale versions and foreign tasks without writing either record', async () => {
    await assert.rejects(service.savePersonalDay(ws, userId, day, { review: { taskId: tasks[0].id, version: 999, action: 'cancel' } }), /changed/);
    await assert.rejects(service.savePersonalDay(ws, userId, day, { review: { taskId: 'foreign-task', version: 1, action: 'cancel' } }), /no longer open/);
    assert.equal(writes.length, 0); assert.equal(saved, null);
  });
  it('choosing a captured or previously reviewed task makes it ready and clears that review decision', async () => {
    tasks[0].status = 'BACKLOG';
    log.metadata.personalDay.decisions = { [tasks[0].id]: { action: 'backlog' } };
    const result = await service.savePersonalDay(ws, userId, day, { taskIds: [tasks[0].id] });
    assert.equal(writes[0].data.status, 'TODO');
    assert.equal(writes[0].data.metadata.inbox, false);
    assert.equal(result.decisions[tasks[0].id], undefined);
  });
  it('rejects priority choices from an older daily-plan revision before writing', async () => {
    log.version = 2;
    await assert.rejects(service.savePersonalDay(ws, userId, day, { taskIds: [], expectedRevision: 1 } as any), /plan changed/);
    assert.equal(writes.length, 0); assert.equal(saved, null);
  });
});
