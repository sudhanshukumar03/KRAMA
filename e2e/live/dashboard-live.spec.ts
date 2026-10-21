import { test, expect, request as createRequest, type APIRequestContext } from './fixtures';
import crypto from 'node:crypto';
import { reportingClock, validDayKey } from '../../apps/server/src/services/reportingTime';
test.describe.configure({ mode: 'serial' });
test.skip(process.env.KRAMA_DASHBOARD_VERIFY !== '1', 'Live checks require explicit opt-in');
const marker = `Dashboard Verification ${crypto.randomUUID()}`;
const email = `dashboard-verify-${crypto.randomUUID()}@example.invalid`;
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
test('calendar reporting handles Indian midnight, extreme offsets and DST', () => {
  const india = reportingClock(null, 'Asia/Kolkata'); expect(india.dateKey(new Date('2026-10-06T18:30:00Z'))).toBe('2026-10-07'); expect(india.dayStart('2026-10-07').toISOString()).toBe('2026-10-06T18:30:00.000Z');
  const ny = reportingClock(null, 'America/New_York'); expect(+ny.dayStart('2026-03-09') - +ny.dayStart('2026-03-08')).toBe(23 * 3600000); expect(+ny.dayStart('2026-11-02') - +ny.dayStart('2026-11-01')).toBe(25 * 3600000);
  expect(reportingClock(null, undefined, '-840').dateKey(new Date('2026-10-06T10:00:00Z'))).toBe('2026-10-07');
  expect(validDayKey('2026-02-30')).toBe(false); expect(validDayKey('2028-02-29')).toBe(true); expect(() => reportingClock(null, 'invalid/zone')).toThrow('Invalid timezone'); expect(() => reportingClock(null, undefined, '841')).toThrow('Invalid timezone offset');
});
test('Dashboard summaries retain personal focus time and task progress', async () => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const root = await json('POST', 'goals', { title: 'Dashboard goal', type: 'monthly', progress: 80 }, 201);
  await json('POST', 'goals', { title: 'Dashboard child', type: 'monthly', parentGoalId: root.id, progress: 20 }, 201);
  task = await json('POST', 'tasks', { title: 'Dashboard work', scheduledDate: `${today}T12:00:00Z`, priority: 'HIGH' }, 201);
  habit = await json('POST', 'habits', { name: 'Dashboard routine', cadence: 'daily' }, 201);
  const startTime = new Date(`${today}T06:00:00Z`);
  await prisma.focusSession.createMany({ data: [
    { userId, workspaceId, startTime, duration: 31, completed: true, type: 'pomodoro' },
    { userId, workspaceId, startTime, duration: 31, completed: true, type: 'custom' },
    { userId, workspaceId, startTime, duration: 600, completed: true, type: 'short_break' },
    { userId, workspaceId, startTime, duration: 180, completed: false, type: 'pomodoro' },
  ] });
  await prisma.dailyLog.create({ data: { userId, workspaceId, date: new Date(`${today}T12:00:00Z`), deepWorkMinutes: 45, wins: [], blockers: [] } });
  task = await json('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version });
  const completedAt = task.metadata.completedAt;
  task = await json('PATCH', `tasks/${task.id}`, { title: 'Dashboard work renamed', version: task.version });
  expect(task.metadata.completedAt).toBe(completedAt);
  expect((await json('GET', `dashboard?date=${today}`)).today.tasks.find((row: any) => row.id === task.id).status).toBe('DONE');
  task = await json('PATCH', `tasks/${task.id}`, { status: 'TODO', version: task.version });
  expect(task.metadata.completedAt).toBeNull();
  const writes = await Promise.all([call('PATCH', `tasks/${task.id}`, { description: 'A', version: task.version }), call('PATCH', `tasks/${task.id}`, { description: 'B', version: task.version })]);
  expect(writes.map(r => r.status()).sort()).toEqual([200, 409]);
  const dashboard = await json('GET', `dashboard?date=${today}`);
  expect(dashboard.today.tasks.some((row: any) => row.id === task.id)).toBe(true);
  expect(dashboard.today.focusMinutes).toBeCloseTo(62 / 60);
  expect(dashboard.goals[0].id).toBe(root.id);
  expect(dashboard.activity.every((row: any) => row.userId === userId)).toBe(true);
  expect((await call('GET', 'dashboard?date=2026-02-30')).status()).toBe(400);
  expect((await json('GET', 'dashboard', undefined, 200, secondaryId)).today.focusMinutes).toBe(0);
});

test('mobile dashboard task and habit controls persist and all sections remain reachable', async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 320, height: 640 }); await page.goto('/app/');
  await page.getByRole('button', { name: 'Complete task Dashboard work renamed', exact: true }).click(); await expect(page.getByRole('button', { name: 'Reopen task Dashboard work renamed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete habit Dashboard routine', exact: true }).click(); await expect(page.getByRole('button', { name: 'Uncheck habit Dashboard routine', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.getByRole('button', { name: 'Reopen task Dashboard work renamed', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Uncheck habit Dashboard routine', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('heading', { name: 'Goal Progress', exact: true }).scrollIntoViewIfNeeded(); await expect(page.getByRole('heading', { name: 'Goal Progress', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.getByRole('heading', { level: 1 }).first().scrollIntoViewIfNeeded(); await page.screenshot({ path: test.info().outputPath('dashboard-mobile.png') });
  await page.getByRole('button', { name: 'Reopen task Dashboard work renamed', exact: true }).click(); await page.getByRole('button', { name: 'Uncheck habit Dashboard routine', exact: true }).click();
});
test('quick capture retains failed drafts, schedules today and validates links', async ({ page }) => {
  await login(page); await page.goto('/app/'); await page.getByRole('button', { name: 'Task', exact: true }).click(); const dialog = page.getByRole('dialog', { name: 'Quick capture' });
  await dialog.getByLabel('Title', { exact: true }).fill('Captured today');
  await json('POST', 'tasks', { title: 'Background refresh', scheduledDate: `${today}T12:00:00Z` }, 201); await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Captured today');
  await page.route('**/api/v1/tasks', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { message: 'Simulated failure' } }) : route.continue());
  await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog.getByRole('alert')).toContainText('Your draft is retained'); await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Captured today');
  await page.unroute('**/api/v1/tasks'); await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog).toBeHidden(); await page.goto('/app/inbox'); await page.getByRole('button', { name: 'Schedule today: Captured today', exact: true }).click(); await expect(page.getByRole('button', { name: 'Schedule today: Captured today', exact: true })).toHaveCount(0); await page.goto('/app/'); await expect(page.getByRole('button', { name: 'Complete task Captured today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Link', exact: true }).click(); await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog.getByRole('alert')).toContainText('valid http or https'); await dialog.getByLabel('Link URL').fill('https://example.com'); await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Note', exact: true }).click(); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(page.getByRole('button', { name: 'Note', exact: true })).toBeFocused();
});
test('date queries reject invalid timezone inputs and preserve canonical task days', async () => {
  const response = await api.get(`dashboard?date=${today}`, { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone': 'Pacific/Kiritimati' } }); expect(response.status()).toBe(200); expect((await response.json()).today.tasks.some((t: any) => t.id === task.id)).toBe(true);
  expect((await api.get('dashboard', { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone': 'invalid/zone' } })).status()).toBe(400);
  expect((await api.get('dashboard', { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone-offset': '999' } })).status()).toBe(400);
});
test('empty workspaces and dark layouts render without inventing progress', async ({ page }) => {
  await login(page); await page.evaluate((id: string) => { localStorage.setItem('krama_active_workspace', id); localStorage.setItem('krama-theme', 'dark'); }, secondaryId); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/app/');
  await expect(page.getByText('No unreviewed tasks scheduled or due today.', { exact: true })).toBeVisible(); await page.screenshot({ path: test.info().outputPath('dashboard-dark-empty.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('dashboard filters, detail links, loading layout work', async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 320, height: 640 });
  await page.route('**/api/v1/dashboard*', async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
  await page.goto('/app/');
  await expect(page.getByRole('status', { name: 'Loading your dashboard...' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('group', { name: "Today's work filter" })).toBeVisible(); await page.unroute('**/api/v1/dashboard*');
  const filters = page.getByRole('group', { name: "Today's work filter" });
  expect(await page.getByRole('button', { name: 'Complete focus task', exact: true }).evaluate(button => {
    const style = getComputedStyle(button);
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const luminance = (color: string) => {
      context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
        const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  })).toBeGreaterThanOrEqual(4.5);
  await filters.getByRole('button', { name: /^Done / }).click(); await expect(page.getByText('No completed tasks yet.', { exact: true })).toBeVisible();
  await filters.getByRole('button', { name: /^Open / }).click();
  await page.getByRole('button', { name: 'Complete task Captured today', exact: true }).click(); await expect(page.getByRole('button', { name: 'Open task Captured today', exact: true })).toBeHidden();
  await filters.getByRole('button', { name: /^Done / }).click(); await page.getByRole('button', { name: 'Open task Captured today', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board\?task=/); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByLabel('Task Title *', { exact: true })).toHaveValue('Captured today');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await page.goto('/app/'); await page.setViewportSize({ width: 1440, height: 1000 }); await expect(page.getByRole('progressbar', { name: "Today's task completion" })).toBeVisible(); await page.screenshot({ path: test.info().outputPath('dashboard-crafted-desktop.png') });
});

test.afterAll(async () => {
  if (!userId) { await api?.dispose(); return; }
  const { prisma } = await import('../../apps/server/src/prisma');
  const queues = await import('../../apps/server/src/queues');
  try {
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } }); expect(owner.email).toBe(email); expect(owner.name).toBe(marker);
    const owned = await prisma.workspace.findMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); expect(owned.length).toBe(workspaceIds.size);
    const documentIds = new Set((await prisma.document.findMany({ where: { space: { workspaceId: { in: [...workspaceIds] } } }, select: { id: true } })).map(d => d.id));
    for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.aiRetentionQueue, queues.embeddingQueue, queues.documentVersionQueue]) for (const job of await queue.getJobs(['waiting', 'delayed', 'failed', 'completed'])) if (job.data?.userId === userId || workspaceIds.has(job.data?.workspaceId) || documentIds.has(job.data?.documentId)) await job.remove();
    await prisma.timeBlock.deleteMany({ where: { userId } }); await prisma.workspace.deleteMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0); console.log('Audit fixtures removed');
  } finally {
    await api.dispose();
  }
});
