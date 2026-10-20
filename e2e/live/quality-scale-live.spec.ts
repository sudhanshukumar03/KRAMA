import { randomUUID } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { test, expect } from './fixtures';

test.skip(process.env.KRAMA_QUALITY_SCALE !== '1', 'Opt-in mature-workspace qualification on isolated synthetic storage');

test('qualify a mature personal workspace without paid indexing jobs', async ({ page, account }, info) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  // The account fixture validates separate test storage and removes this owner's
  // records afterward. Direct bulk setup intentionally avoids provider/queue work.
  const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: account.workspaceId } });
  expect(owner.createdBy).toBe(account.userId);
  const now = new Date();
  const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 730, 12));
  const workspaceId = account.workspaceId;
  const goals = Array.from({ length: 100 }, (_, index) => ({
    id: randomUUID(), workspaceId, title: `Mature goal ${index}`, type: 'yearly',
    createdAt: historyStart, metadata: { category: 'learning', progressMode: 'manual', status: 'ACTIVE' },
  }));
  await prisma.goal.createMany({ data: goals });
  const projects = Array.from({ length: 200 }, (_, index) => ({
    id: randomUUID(), workspaceId, name: `Mature project ${index}`, goalId: goals[index % goals.length]!.id,
    status: 'active', createdAt: historyStart,
  }));
  await prisma.project.createMany({ data: projects });
  for (let batch = 0; batch < 10; batch++) await prisma.task.createMany({ data: Array.from({ length: 500 }, (_, offset) => {
    const index = batch * 500 + offset;
    return { id: randomUUID(), workspaceId, title: `Mature task ${index}`, projectId: projects[index % projects.length]!.id,
      status: index % 5 === 0 ? 'TODO' as const : 'DONE' as const, position: index, estimateMinutes: 25, createdAt: historyStart };
  }) });
  const habits = Array.from({ length: 50 }, (_, index) => ({
    id: randomUUID(), workspaceId, name: `Mature habit ${index}`, createdAt: historyStart,
    linkedGoalId: goals[index]!.id, scheduledDays: [0, 1, 2, 3, 4, 5, 6],
  }));
  await prisma.habit.createMany({ data: habits });
  // Two years of daily history, ending yesterday; no pre-creation/future logs.
  for (const habit of habits) await prisma.habitCompletion.createMany({ data: Array.from({ length: 730 }, (_, day) => {
    const date = new Date(historyStart.getTime() + day * 86400000);
    return { habitId: habit.id, userId: account.userId, date, completedAt: date };
  }) });
  await prisma.dailyLog.createMany({ data: Array.from({ length: 730 }, (_, day) => ({
    workspaceId, userId: account.userId, date: new Date(historyStart.getTime() + day * 86400000),
    wins: ['Reviewed the next step'], blockers: [], deepWorkMinutes: 50,
  })) });
  const space = await prisma.space.create({ data: { workspaceId, name: 'Mature research' } });
  const longText = Array.from({ length: 120 }, (_, paragraph) => `Long research paragraph ${paragraph}. ${'A decision, its evidence and a useful next step. '.repeat(20)}`);
  const longId = randomUUID();
  for (let batch = 0; batch < 4; batch++) await prisma.document.createMany({ data: Array.from({ length: 500 }, (_, offset) => {
    const index = batch * 500 + offset;
    const paragraphs = index === 0 ? longText : [`Research evidence ${index}. Keep the useful context with the work.`];
    return { id: index === 0 ? longId : randomUUID(), spaceId: space.id, title: `Mature note ${index}`,
      contentMarkdown: paragraphs.join('\n\n'), contentJson: { type: 'doc', content: paragraphs.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) },
      statusBadges: [], createdById: account.userId, lastEditedById: account.userId, createdAt: historyStart };
  }) });
  const counts = { tasks: await prisma.task.count({ where: { workspaceId } }),
    documents: await prisma.document.count({ where: { spaceId: space.id } }),
    habitCompletions: await prisma.habitCompletion.count({ where: { userId: account.userId } }) };
  expect(counts).toEqual({ tasks: 5000, documents: 2000, habitCompletions: 36500 });

  const samples: Array<{ name: string; milliseconds: number; elements?: number }> = [];
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await account.signIn(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('krama-theme', theme), theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [name, route, heading] of [
      ['tasks', '/app/board', 'Tasks'], ['projects', '/app/projects', 'Projects'],
      ['goals', '/app/goals', 'Goals'], ['habits', '/app/habits', 'Habits'],
      ['planner', '/app/planner', 'Planner'],
    ]) {
      const started = performance.now();
      await page.goto(route!);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      samples.push({ name: `${name}-${theme}`, milliseconds: performance.now() - started, elements: await page.locator('*').count() });
      await info.attach(`${name}-${theme}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const started = performance.now();
      await page.goto(`/app/brain?doc=${longId}`);
      const body = page.getByRole('textbox', { name: 'Document body', exact: true });
      await expect(body).toContainText('Long research paragraph 119.');
      samples.push({ name: `long-editor-${width}-${theme}`, milliseconds: performance.now() - started, elements: await page.locator('*').count() });
      await info.attach(`long-editor-${width}-${theme}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  }
  for (const endpoint of ['tasks?limit=200', 'documents?limit=200', 'goals/lite', 'habits?view=tracker']) {
    const times: number[] = [];
    await Promise.all(Array.from({ length: 10 }, async () => { for (let index = 0; index < 5; index++) {
      const start = performance.now(); await account.call('GET', endpoint); times.push(performance.now() - start);
    } }));
    times.sort((a, b) => a - b);
    samples.push({ name: `${endpoint}-p95-ten-clients`, milliseconds: times[Math.ceil(times.length * .95) - 1]! });
  }
  expect(await prisma.knowledgeChunk.count({ where: { document: { spaceId: space.id } } })).toBe(0);
  const exportStarted = performance.now();
  const backup = await account.call('GET', 'workspaces/export');
  const exportMs = performance.now() - exportStarted;
  const backupBytes = Buffer.byteLength(JSON.stringify(backup));
  const importStarted = performance.now();
  // Bulk restore has a 60s server transaction budget; ordinary reads retain the
  // shared 15s request deadline and the separate 500ms p95 assertion below.
  const restored = await account.call('POST', 'workspaces/restore', backup, 201, workspaceId, 65000);
  const importMs = performance.now() - importStarted;
  const restoredCounts = {
    tasks: await prisma.task.count({ where: { workspaceId: restored.id } }),
    documents: await prisma.document.count({ where: { space: { workspaceId: restored.id } } }),
    habitCompletions: await prisma.habitCompletion.count({ where: { habit: { workspaceId: restored.id }, userId: account.userId } }),
  };
  expect(restoredCounts).toEqual(counts);
  expect(await prisma.goal.count({ where: { workspaceId: restored.id } })).toBe(100);
  expect(await prisma.project.count({ where: { workspaceId: restored.id, goal: { workspaceId: restored.id } } })).toBe(200);
  expect(await prisma.task.count({ where: { workspaceId: restored.id, project: { workspaceId: restored.id } } })).toBe(5000);
  expect(await prisma.habit.count({ where: { workspaceId: restored.id, linkedGoal: { workspaceId: restored.id } } })).toBe(50);
  expect(await prisma.dailyLog.count({ where: { workspaceId: restored.id, userId: account.userId } })).toBe(730);
  expect(await prisma.knowledgeChunk.count({ where: { document: { space: { workspaceId: restored.id } } } })).toBe(0);
  await info.attach('mature-workspace-measurements', { contentType: 'application/json', body: JSON.stringify({
    profile: 'Isolated local API + production preview, no throttle, cache retained; no real AI jobs; controlled lab measurements, not field Web Vitals',
    machine: { platform: process.platform, node: process.version, cpu: cpus()[0]?.model, totalMemoryBytes: totalmem() },
    counts: { ...counts, goals: 100, projects: 200, habits: 50, dailyLogs: 730 }, samples, runtimeErrors,
    backup: { bytes: backupBytes, exportMs, importMs, restoredCounts },
  }, null, 2) });
  expect(runtimeErrors).toEqual([]);
  expect(importMs, 'bulk restore must finish within its server transaction budget').toBeLessThanOrEqual(60000);
  for (const sample of samples) expect(sample.milliseconds, sample.name).toBeLessThanOrEqual(sample.name.includes('p95') ? 500 : 2000);
});
