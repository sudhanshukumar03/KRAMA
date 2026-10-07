import { test, expect, request as createRequest, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { reportingClock, shiftDay, validDayKey } from '../apps/server/src/services/reportingTime';
test.describe.configure({ mode: 'serial' });
test.skip(process.env.KRAMA_CROSS_SECTION_VERIFY !== '1', 'Live checks require explicit opt-in');
const marker = `Cross Section Verification ${crypto.randomUUID()}`;
const email = `cross-section-verify-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString('hex');
let api: APIRequestContext, token = '', userId = '', workspaceId = '', secondaryId = '', today = '', habit: any, task: any;
const workspaceIds = new Set<string>();
async function call(method: string, path: string, data?: any, workspace = workspaceId) {
  return api.fetch(path, { method, data, timeout: 30000, headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspace, 'x-timezone': 'Asia/Kolkata' } }).catch(() => { throw new Error(`${method} ${path}: transport failure`); });
}
async function json(method: string, path: string, data?: any, status = 200, workspace = workspaceId) {
  const response = await call(method, path, data, workspace); expect(response.status(), `${method} ${path}`).toBe(status); return response.json();
}
async function login(page: any) {
  await page.goto('/login'); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL(/\/app(?:\/|$)/);
  await page.evaluate((id: string) => localStorage.setItem('krama_active_workspace', id), workspaceId);
}
test.beforeAll(async () => {
  api = await createRequest.newContext({ baseURL: new URL('/api/v1/', process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000').href });
  const response = await api.post('auth/signup', { data: { name: marker, email, password } }); expect(response.status()).toBe(201);
  const auth = await response.json(); token = auth.accessToken; userId = auth.user.id;
  const workspaces = await json('GET', 'workspaces'); workspaceId = workspaces.find((w: any) => w.createdBy === userId).id; workspaceIds.add(workspaceId);
  secondaryId = (await json('POST', 'workspaces', { name: `${marker} secondary` }, 201)).id; workspaceIds.add(secondaryId);
  today = reportingClock(null, 'Asia/Kolkata').dateKey(new Date());
});

const checks: { flow: string; status: 'working' | 'needs-repair'; detail: string }[] = [];
function record(flow: string, working: boolean, detail: string) {
  checks.push({ flow, status: working ? 'working' : 'needs-repair', detail });
  console.log(`${working ? 'FLOW PASS' : 'FLOW GAP'}: ${flow}: ${detail}`);
}
async function freshSchedule() {
  return json('GET', 'focus-sessions/schedule');
}

test('verify repaired related task flows across workspaces without changing real-user data', async ({ page }) => {
  await json('PATCH', 'auth/me/preferences', { locationConfig: { countryCode: 'IN', regionCode: 'KA' }, weeklyCapacityMinutes: 2400 });
  const empty = await json('GET', 'focus-sessions/schedule'); expect(empty.plan).toHaveLength(0);
  const goal = await json('POST', 'goals', { title: 'Flow outcome', type: 'monthly', targetDate: `${today}T12:00:00Z`, metadata: { progressMode: 'auto' } }, 201);
  const project = await json('POST', 'projects', { name: 'Flow initiative', goalId: goal.id }, 201);
  task = await json('POST', 'tasks', { title: 'Flow scheduled task', status: 'TODO', projectId: project.id, estimateMinutes: 25, scheduledDate: `${today}T12:00:00Z` }, 201);
  const stale = await json('GET', 'focus-sessions/schedule');
  record('Board/Planner task changes → Focus schedule', stale.plan.some((slot: any) => slot.taskId === task.id), 'A task created for today appears in Focus immediately.');
  const schedule = await freshSchedule(); expect(schedule.plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
  let week = await json('GET', `planner/week?start=${today}&end=${today}`);
  let dashboard = await json('GET', 'dashboard');
  record('Board → Planner and Dashboard', week.tasks.some((row: any) => row.id === task.id) && dashboard.today.tasks.some((row: any) => row.id === task.id), 'The same scheduled task is returned in Planner and Dashboard.');
  const block = await json('POST', 'planner/time-blocks', { title: 'Flow first block', type: 'WORK', date: today, startTime: '09:00', endTime: '09:30', taskId: task.id, projectId: project.id }, 201);
  const cachedBlock = await json('GET', 'focus-sessions/schedule');
  record('Planner time-block changes → Focus', cachedBlock.plan.some((slot: any) => slot.timeBlockId === block.id), 'A new Planner block replaces its synthetic Focus slot immediately.');
  const unscheduled = await json('POST', 'tasks', { title: 'Flow linked-only task', projectId: project.id }, 201);
  const linked = await json('POST', 'planner/time-blocks', { title: 'Flow second block', type: 'WORK', date: today, startTime: '10:00', endTime: '10:30', taskId: unscheduled.id, projectId: project.id }, 201);
  const linkedSchedule = await freshSchedule(); const slot = linkedSchedule.plan.find((entry: any) => entry.timeBlockId === linked.id);
  record('Planner linked-only task → Focus identity', slot?.taskTitle === unscheduled.title, `A task linked to a block without its own date should retain its task title; observed ${slot?.taskTitle}.`);
  task = await json('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version });
  await expect.poll(async () => (await json('GET', `goals/${goal.id}`)).progress).toBe(50);
  dashboard = await json('GET', 'dashboard'); const projectRow = dashboard.projects.find((row: any) => row.id === project.id);
  const overview = await json('GET', 'analytics/overview?range=7d');
  record('Board completion → Projects, Goals, Dashboard, Analytics', projectRow.progress === 50 && dashboard.today.tasks.find((row: any) => row.id === task.id)?.status === 'DONE' && overview.at(-1).completedTasks === 1 && overview.at(-1).okrPace === 50, 'Completing one of two project tasks gives 50% project/automatic goal progress and one completed task in Analytics.');
  const completedSchedule = await freshSchedule();
  record('Completed task → Focus exclusion', !completedSchedule.plan.some((entry: any) => entry.taskId === task.id), 'Completing a task should also exclude it when an existing Planner block still links to it.');
  const sessionInput = { type: 'pomodoro', duration: 120, startTime: new Date(Date.now() - 120000).toISOString(), endTime: new Date().toISOString(), taskId: unscheduled.id, projectId: project.id };
  const completion = await json('POST', 'focus-sessions', sessionInput, 201);
  const history = await json('GET', 'analytics/focus-history?range=7d'); const focusOverview = await json('GET', 'analytics/overview?range=7d'); dashboard = await json('GET', 'dashboard');
  record('Focus → Dashboard and Analytics task history', history.sessions.some((entry: any) => entry.id === completion.session.id && entry.task?.id === unscheduled.id && entry.project?.id === project.id) && focusOverview.at(-1).deepWorkLogged === 2 && dashboard.today.focusMinutes === 2, 'A completed two-minute work session preserves task/project identity and contributes two minutes to both reports.');
  await json('POST', 'focus-sessions', { ...sessionInput, type: 'short_break', duration: 600 }, 201);
  const afterBreak = await json('GET', 'analytics/overview?range=7d'); const afterBreakSchedule = await freshSchedule();
  record('Focus breaks → work totals', afterBreak.at(-1).deepWorkLogged === 2 && afterBreakSchedule.alreadyLoggedMinutes === 2, 'Breaks remain in history but do not inflate work totals or consume the work cap.');
  const morningStart = new Date(`${shiftDay(today, -1)}T20:00:00Z`);
  await json('POST', 'focus-sessions', { ...sessionInput, duration: 120, startTime: morningStart.toISOString(), endTime: new Date(+morningStart + 120000).toISOString() }, 201);
  const dayOverview = await json('GET', 'analytics/overview?range=7d'); const daySchedule = await freshSchedule();
  record('Focus daily cap ↔ Analytics timezone', daySchedule.alreadyLoggedMinutes === dayOverview.at(-1).deepWorkLogged, `India-local early-morning work should agree across views; Focus cap reports ${daySchedule.alreadyLoggedMinutes} min and Analytics reports ${dayOverview.at(-1).deepWorkLogged} min.`);
  const duplicate = await json('POST', 'focus-sessions', sessionInput, 201);
  record('Focus save retries → one session', duplicate.session.id === completion.session.id, 'Reposting the same completion returns its original session without counting work twice.');
  habit = await json('POST', 'habits', { name: 'Flow routine', cadence: 'daily', pinnedToPlanner: true }, 201);
  await json('PATCH', 'planner/routine-occurrences', { id: `${habit.id}-${today}`, habitId: habit.id, date: `${today}T12:00:00Z`, completed: true });
  const habits = await json('GET', 'habits'); dashboard = await json('GET', 'dashboard'); const habitAnalytics = await json('GET', 'analytics/overview?range=7d');
  record('Planner routine → Habits, Dashboard and Analytics', habits.find((row: any) => row.id === habit.id).completions.length === 1 && dashboard.habits.find((row: any) => row.id === habit.id).completions.length === 1 && habitAnalytics.at(-1).activeStreaks === 1, 'Checking a Planner routine records the same personal habit completion and streak across sections.');
  await json('DELETE', `habits/${habit.id}/log?date=${today}`); week = await json('GET', `planner/week?start=${today}&end=${today}`);
  record('Habits uncheck → Planner routine', week.occurrences.some((row: any) => row.habitId === habit.id && !row.completed), 'Removing the habit checkoff also unchecks the Planner occurrence.');
  const space = await json('POST', 'spaces', { name: 'Flow notes' }, 201);
  const document = await json('POST', 'documents', { title: 'Flow project notes', spaceId: space.id, projectId: project.id }, 201);
  const converted = await json('POST', `documents/${document.id}/tasks`, { title: 'Flow task from notes' }, 201);
  const links = await json('GET', `documents/${document.id}/links`); const projectDocumentCount = (await json('GET', `projects/${project.id}`))._count.documents;
  record('Projects ↔ Brain → Board task', converted.task.projectId === project.id && links.outgoing.some((row: any) => row.targetId === converted.task.id) && projectDocumentCount === 1 && (await json('GET', 'tasks')).some((row: any) => row.id === converted.task.id), 'Project-linked notes create a Board task in the same project with a source-document link.');
  await expect.poll(async () => (await json('GET', `goals/${goal.id}`)).progress).toBe(33);
  const goalAfterBrain = await json('GET', `goals/${goal.id}`);
  record('Brain task creation → automatic Goals', goalAfterBrain.progress === 33, `Adding a third project task should update automatic goal progress from 50% to 33%; observed ${goalAfterBrain.progress}%.`);
  week = await json('GET', `planner/week?start=${today}&end=${today}`);
  record('Goal deadline → Planner', week.goalDeadlines.some((row: any) => row.id === goal.id), 'The automatic goal deadline appears in Planner.');
  await login(page); await page.goto('/app/');
  await page.getByRole('button', { name: 'Open task Flow scheduled task', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Directive Title *', { exact: true })).toHaveValue(task.title);
  record('Dashboard → Board task dialog', true, 'The Dashboard task link opens the correct task details in Execution Board.');
  await json('PATCH', 'auth/me/preferences', { timerPreferences: { focusDuration: 1, shortBreak: 5, longBreak: 15, longBreakAfter: 4 } }); await freshSchedule();
  await page.evaluate(() => localStorage.setItem('krama.focus.settings', JSON.stringify({ focusDuration: 1, shortBreak: 5, longBreak: 15, longBreakAfter: 4, customDuration: 45, autoStartBreaks: false, autoStartPomodoros: false, soundEnabled: false })));
  let submittedSeconds: number | undefined;
  await page.route('**/api/v1/focus-sessions', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    submittedSeconds = route.request().postDataJSON().duration;
    await route.fulfill({ status: 201, json: { session: { id: 'simulated-timer-audit' } } });
  });
  await page.goto('/app/analytics'); await page.getByRole('button', { name: 'Start Focus', exact: true }).click(); await expect(page).toHaveURL(/\/focus$/); await expect(page.getByRole('button', { name: 'Settings and options' })).toBeVisible();
  record('Analytics → Focus navigation', true, 'Start Focus now uses the mounted /focus route.');
  await page.goto('/app/'); await page.getByRole('button', { name: 'Start Focus', exact: true }).click(); await expect(page).toHaveURL(/\/focus$/);
  record('Dashboard → Focus navigation', true, 'Start Focus now uses the mounted /focus route.');
  await page.clock.install(); await page.reload(); await expect(page.getByRole('button', { name: 'Settings and options' })).toBeVisible();
  await expect.poll(async () => page.title()).toContain('(01:00)');
  await page.keyboard.press('Space'); await page.clock.runFor(20000); await page.keyboard.press('Space'); await page.clock.runFor(120000); await page.keyboard.press('Space'); await page.clock.runFor(41000);
  await expect.poll(() => submittedSeconds).toBeDefined();
  record('Focus pause/resume → reported work duration', submittedSeconds === 60, `A 60-second timer with a 120-second pause should report 60 seconds of work; observed ${submittedSeconds} seconds. The save was intercepted and did not alter reporting records.`);
  writeFileSync('docs/cross-section-flow-check-2026-10-07.json', JSON.stringify({ checkedAt: new Date().toISOString(), scope: 'Isolated local fixture audit; no production deployment or real-user data changes', checks }, null, 2));
  expect(checks.length).toBeGreaterThan(10);
  expect(checks.filter(check => check.status !== 'working')).toEqual([]);
});

test('completion retries are atomic and reject reused identifiers with changed data', async () => {
  const input = { completionId: crypto.randomUUID(), duration: 30, type: 'custom', startTime: new Date(Date.now() - 30000).toISOString(), endTime: new Date().toISOString() };
  const responses = await Promise.all(Array.from({ length: 4 }, () => json('POST', 'focus-sessions', input, 201)));
  expect(new Set(responses.map(response => response.session.id)).size).toBe(1);
  const { prisma } = await import('../apps/server/src/prisma');
  expect(await prisma.focusSession.count({ where: { id: input.completionId, userId, workspaceId } })).toBe(1);
  expect(await prisma.activityLog.count({ where: { entityId: input.completionId, userId, workspaceId } })).toBe(1);
  await json('POST', 'focus-sessions', { ...input, duration: 31 }, 409);
  await json('POST', 'focus-sessions', { ...input, taskId: task.id }, 409);
  await json('POST', 'focus-sessions', input, 409, secondaryId);
  record('Concurrent Focus retries → one session and activity', true, 'Four concurrent requests create one session and one activity; changes to duration, task or workspace return conflict.');
});

test('mounted Focus refreshes Planner changes and preserves a failed save across reload', async ({ page }) => {
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('krama.focus.mode', 'planner');
    localStorage.setItem('krama.focus.layout', 'sidebar');
    localStorage.setItem('krama.focus.settings', JSON.stringify({ focusDuration: 1, shortBreak: 5, longBreak: 15, longBreakAfter: 4, customDuration: 45, autoStartBreaks: false, autoStartPomodoros: false, soundEnabled: false }));
  });
  await page.goto('/focus');
  await expect.poll(async () => page.title()).toContain('(01:00)');
  const liveBlock = await json('POST', 'planner/time-blocks', { title: 'Flow live schedule refresh', type: 'WORK', date: today, startTime: '08:00', endTime: '08:01' }, 201);
  await expect(page.getByText('Flow live schedule refresh', { exact: true }).first()).toBeVisible();
  await page.getByRole('button').filter({ hasText: 'Flow live schedule refresh' }).click();
  await json('PATCH', 'auth/me/preferences', { timerPreferences: { focusDuration: 2, shortBreak: 5, longBreak: 15, longBreakAfter: 4 } });
  await expect.poll(async () => page.title()).toContain('(02:00)');
  await json('PATCH', 'auth/me/preferences', { timerPreferences: { focusDuration: 1, shortBreak: 5, longBreak: 15, longBreakAfter: 4 } });
  await expect.poll(async () => page.title()).toContain('(01:00)');
  record('Timer preferences → idle Focus duration', true, 'Changing preferences updates the selected idle slot even when its identity and label stay the same.');
  expect((await call('DELETE', `planner/time-blocks/${liveBlock.id}`)).status()).toBe(204);
  await expect(page.getByText('Flow live schedule refresh', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Flow linked-only task', { exact: true }).first()).toBeVisible();
  record('Planner edits → mounted Focus refresh', true, 'A new block and its removal refresh the visible plan without reloading, while retaining the selected task.');
  const originalSlot = (await json('GET', 'focus-sessions/schedule')).plan[0];
  let failed = true;
  const payloads: any[] = [];
  await page.route('**/api/v1/focus-sessions', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    payloads.push(route.request().postDataJSON());
    if (failed) return route.fulfill({ status: 503, json: { message: 'Simulated save outage' } });
    return route.continue();
  });
  await page.clock.install();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('Space');
  await page.clock.runFor(20000);
  const alternate = (await json('GET', 'tasks')).find((row: any) => row.title === 'Flow task from notes');
  await json('PATCH', `planner/time-blocks/${originalSlot.timeBlockId}`, { taskId: alternate.id });
  await page.clock.runFor(45000);
  // Advance retry delays independently of the work timer.
  for (let i = 0; i < 5 && payloads.length < 3; i++) { await page.clock.runFor(5000); await page.waitForTimeout(100); }
  const retry = page.getByRole('button', { name: 'Retry saving session', exact: true });
  await expect(retry).toBeVisible();
  expect(payloads).toHaveLength(3);
  expect(payloads.every(payload => JSON.stringify(payload) === JSON.stringify(payloads[0]))).toBe(true);
  expect(payloads[0].duration).toBe(60);
  expect(payloads[0].taskId).toBe(originalSlot.taskId);
  record('Active Focus → stable task identity', true, 'Reassigning its Planner block while the timer runs does not change the recorded task.');
  const saved = await page.evaluate((key: string) => JSON.parse(localStorage.getItem(key)!), `krama.focus.unsaved.${userId}.${workspaceId}`);
  expect(saved).toEqual(payloads[0]);
  await page.screenshot({ path: 'test-results/cross-section-flow/unsaved-session.png' });
  await page.reload();
  await expect(retry).toBeVisible();
  expect(payloads).toHaveLength(3);
  failed = false;
  await retry.click();
  await expect(retry).not.toBeVisible();
  expect(payloads).toHaveLength(4);
  expect(payloads[3]).toEqual(saved);
  await expect.poll(() => page.evaluate((key: string) => localStorage.getItem(key), `krama.focus.unsaved.${userId}.${workspaceId}`)).toBeNull();
  const history = await json('GET', 'analytics/focus-history?range=7d');
  expect(history.sessions.filter((entry: any) => entry.id === saved.completionId)).toHaveLength(1);
  record('Failed Focus save → reload and explicit retry', true, 'Exhausted retries keep the exact unsaved completion, reload restores Retry, and a successful retry records it once and clears the draft.');
  writeFileSync('docs/cross-section-flow-check-2026-10-07.json', JSON.stringify({ checkedAt: new Date().toISOString(), scope: 'Isolated local fixture repair verification; no production deployment or real-user data changes', checks }, null, 2));
  expect(checks.filter(check => check.status !== 'working')).toEqual([]);
});

test.afterAll(async () => {
  if (!userId) { await api?.dispose(); return; }
  const { prisma } = await import('../apps/server/src/prisma');
  const queues = await import('../apps/server/src/queues'); const { connection } = await import('../apps/server/src/lib/redis'); const { redisService } = await import('../apps/server/src/services/redis.service');
  try {
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } }); expect(owner.email).toBe(email); expect(owner.name).toBe(marker);
    const owned = await prisma.workspace.findMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); expect(owned.length).toBe(workspaceIds.size);
    const documentIds = new Set((await prisma.document.findMany({ where: { space: { workspaceId: { in: [...workspaceIds] } } }, select: { id: true } })).map(d => d.id));
    for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.analyticsQueue, queues.embeddingQueue, queues.documentVersionQueue]) for (const job of await queue.getJobs(['waiting', 'delayed', 'failed', 'completed'])) if (job.data?.userId === userId || workspaceIds.has(job.data?.workspaceId) || documentIds.has(job.data?.documentId)) await job.remove();
    await prisma.timeBlock.deleteMany({ where: { userId } }); await prisma.workspace.deleteMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0); console.log('Audit fixtures removed');
  } finally {
    await Promise.all([queues.notificationsQueue.close(), queues.habitStreakQueue.close(), queues.analyticsQueue.close(), queues.embeddingQueue.close(), queues.documentVersionQueue.close()]); redisService.client.disconnect(); connection.disconnect(); await prisma.$disconnect(); await (globalThis as any).pool?.end(); await api.dispose();
  }
});

