import { test, expect } from './fixtures';

test('bounded task reads retain all rows, filter semantics and workspace isolation', async ({ account }) => {
  const ids = [];
  for (let index = 0; index < 6; index++) ids.push((await account.call('POST', 'tasks', { title: `Page task ${index}`, status: index === 5 ? 'CANCELED' : 'TODO' }, 201)).id);
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await account.call('GET', 'tasks?limit=2' + (cursor ? `&cursor=${cursor}` : ''));
    expect(page.items.length).toBeLessThanOrEqual(2);
    seen.push(...page.items.map((task: { id: string }) => task.id)); cursor = page.nextCursor;
  } while (cursor);
  expect(seen.sort()).toEqual(ids.slice(0, 5).sort());
  expect(new Set(seen).size).toBe(5);
  expect((await account.call('GET', 'tasks?limit=2&status=CANCELED')).items.map((task: { id: string }) => task.id)).toEqual([ids[5]]);
  expect(Array.isArray(await account.call('GET', 'tasks'))).toBe(true); // Existing API contract remains supported.
  for (const query of ['limit=0', 'limit=501', 'limit=1.5', 'cursor=invalid', 'status=unknown']) await account.call('GET', `tasks?${query}`, undefined, 400);
  const other = await account.call('POST', 'workspaces', { name: 'Separate scoped page' }, 201);
  expect((await account.call('GET', 'tasks?limit=2', undefined, 200, other.id)).items).toEqual([]);
});

test('cached habit summaries change immediately after log, undo and schedule edits', async ({ account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const habit = await account.call('POST', 'habits', { name: 'Read consistently' }, 201);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const date = (offset: number) => new Date(new Date(today + 'T12:00:00Z').getTime() + offset * 86400000).toISOString().slice(0, 10);
  await prisma.habit.update({ where: { id: habit.id, workspaceId: account.workspaceId }, data: { createdAt: new Date(date(-3) + 'T00:00:00Z') } });
  const summary = async () => (await account.call('GET', 'habits')).find((item: { id: string }) => item.id === habit.id);
  for (const day of [date(-1), today]) await account.call('POST', `habits/${habit.id}/log`, { date: day });
  expect(await summary()).toMatchObject({ streak: 2, bestStreak: 2 });
  expect(await summary()).toMatchObject({ streak: 2, bestStreak: 2 }); // Warm the read cache.
  await account.call('POST', `habits/${habit.id}/log`, { date: date(-2) });
  expect(await summary()).toMatchObject({ streak: 3, bestStreak: 3 });
  await account.call('DELETE', `habits/${habit.id}/log?date=${date(-2)}`);
  expect(await summary()).toMatchObject({ streak: 2, bestStreak: 2 });
  const current = await summary();
  await account.call('PATCH', `habits/${habit.id}`, { cadence: 'weekly', weeklyTarget: 7, version: current.version });
  expect(await summary()).toMatchObject({ streak: 0, bestStreak: 0 });
  const tracker = (await account.call('GET', 'habits?view=tracker'))[0];
  expect(tracker).toMatchObject({ streak: 0, bestStreak: 0 });
  expect(Object.keys(tracker.completions[0]).sort()).toEqual(['date', 'offSchedule']);
});

test('Dashboard habit streaks use its requested reporting timezone', async ({ account, request }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const habit = await account.call('POST', 'habits', { name: 'Timezone routine' }, 201);
  const zones = ['Etc/GMT+12', 'Pacific/Kiritimati'];
  const day = (zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date());
  const earlier = day(zones[0]);
  const completion = new Date(new Date(earlier + 'T12:00:00Z').getTime() - 86400000);
  await prisma.habit.update({ where: { id: habit.id, workspaceId: account.workspaceId }, data: { createdAt: new Date(completion.getTime() - 86400000) } });
  await prisma.habitCompletion.create({ data: { habitId: habit.id, userId: account.userId, date: completion } });
  const auth = await account.call('POST', 'auth/login', { email: account.email, password: account.password });
  for (const [index, zone] of zones.entries()) {
    const response = await request.get(new URL('/api/v1/dashboard', process.env.KRAMA_API_TARGET).href, {
      headers: { Authorization: `Bearer ${auth.accessToken}`, 'x-workspace-id': account.workspaceId, 'x-timezone': zone },
    });
    expect(response.status()).toBe(200);
    const dashboard = await response.json();
    expect(dashboard.dateKey).toBe(day(zone));
    expect(dashboard.habits[0].streak).toBe(index === 0 ? 1 : 0);
  }
});

test('historical backfills cannot hide current habit completion days', async ({ account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const habit = await account.call('POST', 'habits', { name: 'Backfilled routine' }, 201);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const noon = new Date(today + 'T12:00:00Z');
  await prisma.habit.update({ where: { id: habit.id, workspaceId: account.workspaceId }, data: { createdAt: new Date(noon.getTime() - 200 * 86400000) } });
  await prisma.habitCompletion.createMany({ data: Array.from({ length: 120 }, (_, index) => ({
    habitId: habit.id, userId: account.userId, date: new Date(noon.getTime() - (190 - index) * 86400000), completedAt: new Date(),
  })) });
  await prisma.habitCompletion.create({ data: { habitId: habit.id, userId: account.userId, date: noon, completedAt: new Date(Date.now() - 86400000) } });
  for (const endpoint of ['habits', 'habits?view=tracker']) {
    const summary = (await account.call('GET', endpoint))[0];
    expect(summary).toMatchObject({ streak: 1, bestStreak: 120 });
    expect(summary.completions).toHaveLength(120);
    expect(summary.completions[0].date.slice(0, 10)).toBe(today);
  }
});

test('navigation projections are bounded, scoped and preserve badge rules', async ({ account }) => {
  for (let index = 0; index < 8; index++) await account.call('POST', 'tasks', {
    title: `Navigation task ${index}`, status: index === 1 ? 'DONE' : index === 2 ? 'CANCELED' : 'TODO', metadata: { inbox: index < 3 },
  }, 201);
  const space = await account.call('POST', 'spaces', { name: 'Navigation notes' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Navigation inbox note', spaceId: space.id, statusBadges: ['Inbox'] }, 201);
  const parent = await account.call('POST', 'goals', { title: 'Active root', type: 'yearly' }, 201);
  await account.call('POST', 'goals', { title: 'Active child', type: 'quarterly', parentGoalId: parent.id }, 201);
  for (const status of ['PAUSED', 'COMPLETED', 'CANCELED']) await account.call('POST', 'goals', { title: status, type: 'yearly', status }, 201);
  await account.call('POST', 'projects', { name: 'Active project' }, 201);
  await account.call('POST', 'projects', { name: 'Paused project', status: 'paused' }, 201);
  await account.call('POST', 'habits', { name: 'Navigation routine' }, 201);
  expect(await account.call('GET', 'workspaces/summary')).toEqual({ openIssues: 6, inbox: 2, projects: 1, goals: 2, habits: 1, documents: 1 });
  const recent = await account.call('GET', 'search/recent');
  expect(recent.results.length).toBeLessThanOrEqual(24);
  expect(recent.results.filter((row: { type: string }) => row.type === 'issue')).toHaveLength(6);
  expect(recent.results.some((row: { id: string }) => row.id === doc.id)).toBe(true);
  await account.call('GET', 'search?q=a&q=b', undefined, 400);
  await account.call('GET', 'search?q=' + 'a'.repeat(2001), undefined, 400);
  const separate = await account.call('POST', 'workspaces', { name: 'Separate navigation' }, 201);
  expect(await account.call('GET', 'workspaces/summary', undefined, 200, separate.id)).toEqual({ openIssues: 0, inbox: 0, projects: 0, goals: 0, habits: 0, documents: 0 });
  expect((await account.call('GET', 'search/recent', undefined, 200, separate.id)).results).toEqual([]);
  await account.call('DELETE', `spaces/${space.id}`);
  expect((await account.call('GET', 'search/recent')).results.some((row: { id: string }) => row.id === doc.id)).toBe(false);
  expect(await account.call('GET', 'workspaces/summary')).toMatchObject({ documents: 0, inbox: 1 });
});

test('hybrid retrieval excludes stale, orphaned and mismatched workspace chunks', async ({ account }) => {
  const { randomUUID } = await import('node:crypto');
  const { prisma } = await import('../../apps/server/src/prisma');
  const { vectorSearch, keywordSearch } = await import('../../apps/server/src/services/rag/retriever');
  const other = await account.call('POST', 'workspaces', { name: 'Separate retrieval scope' }, 201);
  const space = await prisma.space.create({ data: { workspaceId: account.workspaceId, name: 'Active evidence' } });
  const deletedSpace = await prisma.space.create({ data: { workspaceId: account.workspaceId, name: 'Deleted evidence', deletedAt: new Date() } });
  const otherSpace = await prisma.space.create({ data: { workspaceId: other.id, name: 'Other workspace' } });
  const documents = await Promise.all([space, deletedSpace, otherSpace, space].map((entry, index) => prisma.document.create({ data: {
    spaceId: entry.id, title: `Retrieval source ${index}`, contentJson: {}, contentMarkdown: 'SYNTHETICGROUND77',
    createdById: account.userId, lastEditedById: account.userId, ...(index === 3 ? { deletedAt: new Date() } : {}),
  } })));
  const ids: string[] = [];
  const embedding = [1, ...Array<number>(767).fill(0)];
  try {
    for (const document of [...documents, null]) {
      const id = randomUUID(); ids.push(id);
      await prisma.$executeRaw`INSERT INTO "KnowledgeChunk" (id, "workspaceId", "documentId", content, "chunkIndex", embedding, "updatedAt")
        VALUES (${id}, ${account.workspaceId}, ${document?.id ?? null}, 'SYNTHETICGROUND77', 0, ${JSON.stringify(embedding)}::vector, NOW())`;
    }
    for (const results of [await vectorSearch(account.workspaceId, embedding), await keywordSearch(account.workspaceId, 'SYNTHETICGROUND77')]) {
      expect(results.map(row => row.id)).toEqual([ids[0]]);
    }
  } finally { await prisma.knowledgeChunk.deleteMany({ where: { id: { in: ids } } }); }
});

test('a late duplicate in a batched backup restore rolls back the whole new workspace', async ({ account }) => {
  const { randomUUID } = await import('node:crypto');
  const { prisma } = await import('../../apps/server/src/prisma');
  const habit = await account.call('POST', 'habits', { name: 'Backup history' }, 201);
  await prisma.habit.update({ where: { id: habit.id }, data: { createdAt: new Date('2023-12-31T12:00:00Z') } });
  const history = Array.from({ length: 500 }, (_, day) => ({
    habitId: habit.id, userId: account.userId, date: new Date(Date.UTC(2024, 0, day + 1, 12)),
  }));
  await prisma.habitCompletion.createMany({ data: history });
  const backup = await account.call('GET', 'workspaces/export');
  const completions = backup.workspace.habits[0].completions;
  // IDs pass format validation; the unique habit/user/day constraint fails in
  // a later insert batch, after the new workspace and initial history writes.
  completions.push({ ...completions[0], id: randomUUID() });
  const before = await prisma.workspace.count({ where: { createdBy: account.userId } });
  await account.call('POST', 'workspaces/restore', backup, 400);
  expect(await prisma.workspace.count({ where: { createdBy: account.userId } })).toBe(before);
  expect(await prisma.habitCompletion.count({ where: { habitId: habit.id, userId: account.userId } })).toBe(500);
});

test('invalid global AI requests fail validation before provider availability is checked', async ({ account }) => {
  for (const body of [{ message: {} }, { message: 'Hello', ragEnabled: 'false' }, { message: '   ' }, { prompt: 'a'.repeat(20001) }]) {
    const result = await account.call('POST', 'ai/complete', body, 400);
    expect(result.code).toBe('VALIDATION_FAILED');
  }
});
