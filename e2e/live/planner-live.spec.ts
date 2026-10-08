import { test, expect, request as createRequest, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { INDIAN_STATES } from '../../packages/types/src/locations';

test.skip(process.env.KRAMA_LIVE_VERIFY !== '1', 'Live verification requires explicit opt-in');
const marker = `Planner Verification ${crypto.randomUUID()}`;
const email = `planner-verify-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString('hex');
let api: APIRequestContext, userId = '', token = '', workspaceId = '';
const workspaceIds = new Set<string>();
const day = '2026-10-07', movedDay = '2026-10-08';
async function call(method: string, path: string, data?: any, status = 200, workspace: string | null = workspaceId) {
  const response = await api.fetch(path, { method, data, timeout: 30000, headers: { Authorization: `Bearer ${token}`, ...(workspace ? { 'x-workspace-id': workspace } : {}) } }).catch(() => { throw new Error(`${method} ${path}: transport failure`); });
  expect(response.status(), `${method} ${path}`).toBe(status);
  return response;
}
async function json(method: string, path: string, data?: any, status = 200, workspace: string | null = workspaceId) { return (await call(method, path, data, status, workspace)).json(); }
test.beforeAll(async () => {
  api = await createRequest.newContext({ baseURL: new URL('/api/v1/', process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000').href });
  const response = await api.post('auth/signup', { data: { name: marker, email, password } }).catch(() => { throw new Error('Signup transport failure'); });
  expect(response.status()).toBe(201);
  const auth = await response.json(); token = auth.accessToken; userId = auth.user.id;
  const workspaces = await json('GET', 'workspaces');
  workspaceId = workspaces.find((w: any) => w.createdBy === userId).id;
  workspaceIds.add(workspaceId);
});
test('live planner scheduling, recovery, routines, milestones and workspace isolation', async ({ page }) => {
  const project = await json('POST', 'projects', { name: marker }, 201);
  const task = await json('POST', 'tasks', { title: 'Synthetic planner task', description: 'Preserve this task detail', projectId: project.id, scheduledDate: `${day}T12:00:00.000Z` }, 201);
  const habit = await json('POST', 'habits', { name: 'Synthetic planner routine', pinnedToPlanner: true, scheduledDays: [3] }, 201);
  const input = { title: 'Synthetic work block', date: day, startTime: '09:00', endTime: '10:00', type: 'WORK', taskId: task.id, projectId: project.id };
  const block = await json('POST', 'planner/time-blocks', input, 201);
  expect(block.startTime).toBe(`${day}T09:00:00.000Z`);
  await call('POST', 'planner/time-blocks', { ...input, startTime: '09:30', endTime: '10:30' }, 409);
  await call('POST', 'planner/time-blocks', { ...input, startTime: '24:00', endTime: '25:00' }, 400);
  await call('POST', 'planner/time-blocks', { ...input, date: '2026-02-30' }, 400);
  const moved = await json('PATCH', `planner/time-blocks/${block.id}`, { date: movedDay });
  expect(moved.startTime).toBe(`${movedDay}T09:00:00.000Z`); expect(moved.endTime).toBe(`${movedDay}T10:00:00.000Z`);
  await json('PATCH', `planner/time-blocks/${block.id}`, { taskId: null, notes: 'Updated verification notes' });
  const milestone = await json('POST', 'planner/milestones', { title: 'Synthetic checkpoint', date: day, projectId: project.id }, 201);
  await json('PATCH', `planner/milestones/${milestone.id}`, { completed: true });
  const occurrence = { id: `${habit.id}-${day}`, habitId: habit.id, date: `${day}T12:00:00.000Z`, completed: true };
  await json('PATCH', 'planner/routine-occurrences', occurrence);
  let week = await json('GET', 'planner/week?start=2026-10-05&end=2026-10-11');
  expect(week.timeBlocks.find((b: any) => b.id === block.id).taskId).toBeNull();
  expect(week.occurrences.find((o: any) => o.habitId === habit.id && o.date.startsWith(day)).completed).toBe(true);
  expect(week.milestones.find((m: any) => m.id === milestone.id).completed).toBe(true);
  await json('PATCH', 'planner/routine-occurrences', { ...occurrence, completed: false });
  await json('PATCH', 'auth/me/preferences', { weeklyCapacityMinutes: 2430 });
  await call('PATCH', 'auth/me/preferences', { weeklyCapacityMinutes: -1 }, 400);
  await call('PATCH', 'auth/me/preferences', { weeklyCapacityMinutes: 10081 }, 400);
  week = await json('GET', 'planner/week?start=2026-10-05&end=2026-10-11');
  expect(week.occurrences.find((o: any) => o.habitId === habit.id && o.date.startsWith(day)).completed).toBe(false);
  expect(week.capacity.weeklyCapacityMinutes).toBe(2430);
  await json('PATCH', 'auth/me/preferences', { locationConfig: { countryCode: 'IN', regionCode: 'KA' } });
  const regionalCalendar = await json('GET', 'planner/holidays?country=IN&region=KA&start=2026-10-01&end=2026-10-31');
  expect(regionalCalendar.coverage.missingNationalYears).toEqual([]);
  expect(regionalCalendar.coverage.missingRegionalYears).toEqual([]);
  expect(regionalCalendar.holidays.every((holiday: any) => holiday.regionCode === 'KA')).toBe(true);
  const regionalWeek = await json('GET', 'planner/week?start=2026-10-05&end=2026-10-11');
  expect(regionalWeek.holidayCoverage.missingRegionalYears).toEqual([]);
  for (const state of INDIAN_STATES) {
    const calendar = await json('GET', `planner/holidays?country=IN&region=${state.code}&start=2026-01-01&end=2026-12-31`);
    expect(calendar.coverage.missingRegionalYears, state.name).toEqual([]);
    expect(calendar.holidays.every((holiday: any) => holiday.regionCode === state.code), state.name).toBe(true);
    expect(calendar.holidays.length, state.name).toBeGreaterThan(15);
  }
  await json('PATCH', 'auth/me/preferences', { locationConfig: { countryCode: 'IN', regionCode: 'MH' } });
  const shivajiWeek = await json('GET', 'planner/week?start=2026-02-16&end=2026-02-22');
  expect(shivajiWeek.timeBlocks.some((holiday: any) => holiday.isExternal && /Shivaji/.test(holiday.title))).toBe(true);
  expect(shivajiWeek.capacity.occupiedMinutes).toBe(486);
  expect(shivajiWeek.capacity.freeMinutes).toBe(1944);
  const holi = await json('GET', 'planner/holidays?country=IN&region=MH&start=2026-03-01&end=2026-03-07');
  expect(holi.holidays.some((holiday: any) => /Holi/.test(holiday.name) && holiday.date.startsWith('2026-03-03'))).toBe(true);
  expect(holi.holidays.some((holiday: any) => /Holi/.test(holiday.name) && holiday.date.startsWith('2026-03-04'))).toBe(false);
  console.log('LIVE PASS: all 36 regional calendars, state date precedence and holiday capacity');
  await call('GET', 'planner/week?start=2026-02-30&end=2026-03-01', undefined, 400);
  await call('GET', 'planner/week?start=2026-10-11&end=2026-10-05', undefined, 400);
  const other = await json('POST', 'workspaces', { name: `${marker} secondary` }, 201); workspaceIds.add(other.id);
  const otherTask = await json('POST', 'tasks', { title: 'Other workspace fixture' }, 201, other.id);
  await call('PATCH', `planner/time-blocks/${block.id}`, { taskId: otherTask.id }, 403);
  await call('PATCH', `planner/milestones/${milestone.id}`, { completed: false }, 404, other.id);
  await call('DELETE', `planner/milestones/${milestone.id}`, undefined, 404, other.id);
  await call('GET', 'planner/week?start=2026-10-05&end=2026-10-11', undefined, 403, crypto.randomUUID());
  const { prisma } = await import('../../apps/server/src/prisma');
  const membership = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId, workspaceId } } });
  await prisma.workspaceMember.delete({ where: { id: membership.id } });
  try {
    // Without a header, middleware selects the remaining workspace and hides foreign records.
    await call('PATCH', `planner/time-blocks/${block.id}`, { title: 'Must not save' }, 404, null);
    await call('PATCH', `planner/milestones/${milestone.id}`, { completed: false }, 404, null);
  } finally { await prisma.workspaceMember.create({ data: membership }); }
  console.log('LIVE PASS: scheduling, overlap rejection, date moves, routines, milestones, capacity and workspace isolation');

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL(/\/app(?:\/|$)/);
  // Select the fixture workspace explicitly; no existing user's workspace is used.
  await page.evaluate(id => localStorage.setItem('krama_active_workspace', id), workspaceId);
  await page.goto(`/app/planner?mode=day&date=${movedDay}`);
  await expect(page.getByText('Synthetic work block', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit time block', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Time Block' });
  await expect(dialog.getByLabel('Start time')).toHaveValue('09:00');
  await dialog.getByLabel('Time block title').fill('Browser saved work block');
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog).toBeHidden();
  await page.reload(); await expect(page.getByText('Browser saved work block', { exact: true })).toBeVisible();
  await page.goto(`/app/planner?mode=plan&date=${day}`);
  await page.getByRole('button', { name: 'Synthetic planner task', exact: true }).click();
  const taskDialog = page.getByRole('dialog');
  await expect(taskDialog.getByLabel('Description', { exact: true })).toHaveValue('Preserve this task detail');
  await expect(taskDialog.getByRole('combobox').filter({ has: page.locator(`option[value="${project.id}"]`) })).toHaveValue(project.id);
  await taskDialog.getByLabel('Directive Title *', { exact: true }).fill('Browser updated task');
  await taskDialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(taskDialog).toBeHidden();
  const preservedTask = await json('GET', `tasks/${task.id}`);
  expect(preservedTask.description).toBe('Preserve this task detail'); expect(preservedTask.projectId).toBe(project.id);
  console.log('LIVE PASS: weekly task edits preserve description and project association');
  await page.goto('/app/planner?mode=calendar&date=2026-02-19');
  await expect(page.getByText(/Shivaji/).first()).toBeVisible();
  await expect(page.getByText('State holiday dates are unavailable', { exact: false })).toHaveCount(0);
  await page.goto('/app/planner?mode=plan&date=2026-02-19');
  await expect(page.getByText('8h 6m', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('32h 24m', { exact: true }).first()).toBeVisible();
  console.log('LIVE PASS: regional holiday visible in Month view and capacity visible in Week view');
  await call('DELETE', `planner/time-blocks/${block.id}`, undefined, 204);
  await json('DELETE', `planner/milestones/${milestone.id}`);
  console.log('LIVE PASS: browser edit/reload persistence and block/milestone deletion');
});
test.afterAll(async () => {
  if (!userId) { await api?.dispose(); return; }
  const { prisma } = await import('../../apps/server/src/prisma');
  const queues = await import('../../apps/server/src/queues');
  const { connection } = await import('../../apps/server/src/lib/redis');
  const { redisService } = await import('../../apps/server/src/services/redis.service');
  try {
    const owner = await prisma.user.findUnique({ where: { id: userId } });
    expect(owner?.email).toBe(email); expect(owner?.name).toBe(marker);
    const owned = await prisma.workspace.findMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } });
    expect(owned.length).toBe(workspaceIds.size);
    for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.analyticsQueue]) {
      for (const job of await queue.getJobs(['waiting', 'delayed', 'failed', 'completed'])) if (job.data?.userId === userId || workspaceIds.has(job.data?.workspaceId)) await job.remove();
    }
    await prisma.timeBlock.deleteMany({ where: { userId } });
    await prisma.workspace.deleteMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } });
    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
    console.log('LIVE PASS: disposable planner account, workspaces and queued fixtures removed');
  } finally {
    await Promise.all([queues.notificationsQueue.close(), queues.habitStreakQueue.close(), queues.analyticsQueue.close(), queues.embeddingQueue.close(), queues.documentVersionQueue.close()]);
    redisService.client.disconnect(); connection.disconnect();
    await prisma.$disconnect(); const closingPool = (globalThis as any).pool; if (closingPool && !closingPool.ended) await closingPool.end(); await api.dispose();
  }
});
