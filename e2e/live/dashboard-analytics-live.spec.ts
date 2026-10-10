import { test, expect, request as createRequest, type APIRequestContext } from './fixtures';
import crypto from 'node:crypto';
import { reportingClock, shiftDay, validDayKey } from '../../apps/server/src/services/reportingTime';
test.describe.configure({ mode: 'serial' });
test.skip(process.env.KRAMA_DASHBOARD_ANALYTICS_VERIFY !== '1', 'Live checks require explicit opt-in');
const marker = `Dashboard Analytics Verification ${crypto.randomUUID()}`;
const email = `dashboard-analytics-verify-${crypto.randomUUID()}@example.invalid`;
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
test('overview is live, dense and separates personal timer time from Planner logs', async () => {
  for (const days of [7, 30, 90]) { const rows = await json('GET', `analytics/overview?range=${days}d`); expect(rows).toHaveLength(days); expect(rows[0].dayKey).toBe(shiftDay(today, -(days - 1))); expect(rows.at(-1).dayKey).toBe(today); expect(rows.every((r: any) => r.deepWorkLogged === 0)).toBe(true); expect(rows.at(-1).okrPace).toBeNull(); }
  const { prisma } = await import('../../apps/server/src/prisma');
  const root = await json('POST', 'goals', { title: 'Dashboard goal', type: 'monthly', progress: 80 }, 201);
  await json('POST', 'goals', { title: 'Dashboard child', type: 'monthly', parentGoalId: root.id, progress: 20 }, 201);
  task = await json('POST', 'tasks', { title: 'Dashboard work', scheduledDate: `${today}T12:00:00Z`, priority: 'HIGH' }, 201);
  habit = await json('POST', 'habits', { name: 'Dashboard routine', cadence: 'daily' }, 201);
  const startTime = new Date(`${today}T06:00:00Z`);
  await prisma.focusSession.createMany({ data: [{ userId, workspaceId, startTime, duration: 31, completed: true, type: 'pomodoro' }, { userId, workspaceId, startTime, duration: 31, completed: true, type: 'custom' }, { userId, workspaceId, startTime, duration: 600, completed: true, type: 'short_break' }, { userId, workspaceId, startTime, duration: 180, completed: false, type: 'pomodoro' }] });
  await prisma.dailyLog.create({ data: { userId, workspaceId, date: new Date(`${today}T12:00:00Z`), deepWorkMinutes: 45, wins: [], blockers: [] } });
  const rows = await json('GET', 'analytics/overview?range=7d'); expect(rows.at(-1).deepWorkLogged).toBeCloseTo(62 / 60); expect(rows.at(-1).loggedDeepWork).toBe(45); expect(rows.at(-1).goalCount).toBe(1); expect(rows.at(-1).okrPace).toBe(20); expect(rows[0].loggedDeepWork).toBeNull();
  const snapshots = await prisma.workspaceAnalytics.count({ where: { workspaceId } });
  task = await json('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version }); expect((await json('GET', 'analytics/overview?range=7d')).at(-1).completedTasks).toBe(1);
  const completedAt = task.metadata.completedAt; task = await json('PATCH', `tasks/${task.id}`, { title: 'Dashboard work renamed', version: task.version }); expect(task.metadata.completedAt).toBe(completedAt);
  expect(await prisma.workspaceAnalytics.count({ where: { workspaceId } })).toBe(snapshots);
  task = await json('PATCH', `tasks/${task.id}`, { status: 'TODO', version: task.version }); expect(task.metadata.completedAt).toBeNull(); expect((await json('GET', 'analytics/overview?range=7d')).at(-1).completedTasks).toBe(0);
  const writes = await Promise.all([call('PATCH', `tasks/${task.id}`, { description: 'A', version: task.version }), call('PATCH', `tasks/${task.id}`, { description: 'B', version: task.version })]); expect(writes.map(r => r.status()).sort()).toEqual([200, 409]);
  const dashboard = await json('GET', `dashboard?date=${today}`); expect(dashboard.today.tasks.some((t: any) => t.id === task.id)).toBe(true); expect(dashboard.today.focusMinutes).toBeCloseTo(62 / 60); expect(dashboard.goals[0].id).toBe(root.id); expect(dashboard.activity.every((a: any) => a.userId === userId)).toBe(true);
  expect((await call('GET', 'dashboard?date=2026-02-30')).status()).toBe(400); expect((await call('GET', 'analytics/overview?range=8d')).status()).toBe(400);
});
test('personal focus history is paginated and cannot reveal another member or workspace', async () => {
  const { prisma } = await import('../../apps/server/src/prisma'); const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const memberEmail = `dashboard-member-${crypto.randomUUID()}@example.invalid`; const member = await prisma.user.create({ data: { name: `${marker} member`, email: memberEmail, passwordHash: owner.passwordHash, memberships: { create: { workspaceId, role: 'MEMBER' } } } });
  try {
    const foreign = await prisma.focusSession.create({ data: { userId: member.id, workspaceId, duration: 999, completed: true, startTime: new Date(`${today}T06:00:00Z`) } });
    await prisma.focusSession.createMany({ data: Array.from({ length: 21 }, () => ({ userId, workspaceId, startTime: new Date(`${today}T07:00:00Z`), duration: 60, completed: true, type: 'pomodoro' })) });
    const first = await json('GET', 'analytics/focus-history?range=7d'); expect(first.sessions).toHaveLength(20); expect(first.total).toBe(25); expect(first.nextCursor).toBeTruthy();
    const second = await json('GET', `analytics/focus-history?range=7d&cursor=${first.nextCursor}`); expect(second.sessions).toHaveLength(5); expect(second.nextCursor).toBeNull(); expect(new Set([...first.sessions, ...second.sessions].map((s: any) => s.id)).size).toBe(25); expect([...first.sessions, ...second.sessions].every((s: any) => s.userId === userId && !s.user)).toBe(true);
    expect((await call('GET', `analytics/focus-history?range=7d&cursor=${foreign.id}`)).status()).toBe(400); expect((await json('GET', 'analytics/focus-history?range=7d', undefined, 200, secondaryId)).total).toBe(0);
    const auth = await api.post('auth/login', { data: { email: memberEmail, password } }); expect(auth.status()).toBe(200); const memberToken = (await auth.json()).accessToken;
    const response = await api.get('analytics/focus-history?range=7d', { headers: { Authorization: `Bearer ${memberToken}`, 'x-workspace-id': secondaryId } }); expect(response.status()).toBe(403);
  } finally { const owned = await prisma.user.findUniqueOrThrow({ where: { id: member.id } }); expect(owned.email).toBe(memberEmail); expect(owned.name).toBe(`${marker} member`); await prisma.user.delete({ where: { id: member.id } }); }
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
  await dialog.getByRole('button', { name: 'Schedule Task' }).click(); await expect(dialog.getByRole('alert')).toContainText('Your draft is retained'); await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Captured today');
  await page.unroute('**/api/v1/tasks'); await dialog.getByRole('button', { name: 'Schedule Task' }).click(); await expect(dialog).toBeHidden(); await expect(page.getByRole('button', { name: 'Complete task Captured today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Link', exact: true }).click(); await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog.getByRole('alert')).toContainText('valid http or https'); await dialog.getByLabel('Link URL').fill('https://example.com'); await dialog.getByRole('button', { name: 'Save to Inbox' }).click(); await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Note', exact: true }).click(); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(page.getByRole('button', { name: 'Note', exact: true })).toBeFocused();
});
test('analytics range, CSV, accessible daily table and history pagination work on mobile', async ({ page }) => {
  await login(page); await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true); await page.setViewportSize({ width: 320, height: 640 }); await page.goto('/app/analytics'); await page.getByRole('button', { name: '7 days', exact: true }).click();
  await expect(page.getByText('View daily data (7 days)', { exact: true })).toBeVisible(); await page.getByText('View daily data (7 days)', { exact: true }).click(); await expect(page.getByRole('table')).toBeVisible(); expect(await page.getByRole('row').count()).toBe(8);
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click(); const download = await downloadPromise; const file = await download.path(); const fs = await import('node:fs/promises'); const csv = await fs.readFile(file!, 'utf8'); expect(csv.split('\r\n')).toHaveLength(8); expect(csv).toContain('Planner log minutes');
  await expect(page.getByText('Showing 20 of 25 sessions', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Load more sessions', exact: true }).click(); await expect(page.getByText('Showing 25 of 25 sessions', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.getByRole('heading', { name: 'Analytics', exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: test.info().outputPath('analytics-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('button', { name: '30 days', exact: true }).click(); await expect(page.getByText('View daily data (30 days)', { exact: true })).toBeVisible(); await expect(page.getByRole('row').last()).toContainText(today); const chart = page.locator('[aria-label="Focus and Planner chart"]'); const bar = chart.locator('.recharts-bar-rectangle path').last(); await expect(bar).toBeVisible(); await expect.poll(async () => { const cb = await chart.boundingBox(); const bb = await bar.boundingBox(); return Boolean(cb && bb && bb.width > 0 && bb.height > 165 && bb.x > cb.x + cb.width * 0.8); }).toBe(true); await page.screenshot({ path: test.info().outputPath('analytics-desktop.png') });
});
test('overview and focus history failures have independent retry controls', async ({ page }) => {
  await login(page); await page.route('**/api/v1/analytics/focus-history**', route => route.fulfill({ status: 503, json: { message: 'Simulated failure' } })); await page.goto('/app/analytics');
  await expect(page.getByText('Could not load focus history', { exact: true })).toBeVisible({ timeout: 30000 }); await expect(page.getByRole('heading', { name: 'Completed tasks', exact: true })).toBeVisible(); await page.unroute('**/api/v1/analytics/focus-history**'); await page.getByRole('button', { name: /Retry|Try Again/ }).click(); await expect(page.getByText('Showing 20 of 25 sessions', { exact: true })).toBeVisible();
  await page.route('**/api/v1/analytics/overview**', route => route.fulfill({ status: 503, json: { message: 'Simulated failure' } })); await page.reload(); await expect(page.getByText('Could not load analytics', { exact: true })).toBeVisible({ timeout: 30000 }); await expect(page.getByRole('button', { name: '7 days', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled(); await page.unroute('**/api/v1/analytics/overview**'); await page.getByRole('button', { name: /Retry|Try Again/ }).click(); await expect(page.getByRole('heading', { name: 'Completed tasks', exact: true })).toBeVisible();
  await page.route('**/api/v1/analytics/overview**', route => route.fulfill({ status: 503, json: { message: 'Simulated refresh failure' } }));
  await page.getByRole('button', { name: 'Refresh analytics', exact: true }).click();
  await expect(page.getByText('Could not refresh report', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Completed tasks', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
  await page.unroute('**/api/v1/analytics/overview**');
  await page.getByRole('button', { name: 'Retry report', exact: true }).click();
  await expect(page.getByText('Could not refresh report', { exact: true })).toBeHidden();
});
test('date queries reject invalid timezone inputs and preserve canonical task days', async () => {
  const response = await api.get(`dashboard?date=${today}`, { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone': 'Pacific/Kiritimati' } }); expect(response.status()).toBe(200); expect((await response.json()).today.tasks.some((t: any) => t.id === task.id)).toBe(true);
  expect((await api.get('analytics/overview?range=7d', { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone': 'invalid/zone' } })).status()).toBe(400);
  expect((await api.get('dashboard', { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'x-timezone-offset': '999' } })).status()).toBe(400);
});
test('empty workspaces and dark layouts render without inventing progress', async ({ page }) => {
  await login(page); await page.evaluate((id: string) => { localStorage.setItem('krama_active_workspace', id); localStorage.setItem('krama-theme', 'dark'); }, secondaryId); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/app/');
  await expect(page.getByText('No tasks scheduled or due today.', { exact: true })).toBeVisible(); await page.screenshot({ path: test.info().outputPath('dashboard-dark-empty.png') });
  await page.goto('/app/analytics'); await expect(page.getByText('Create a goal to track progress', { exact: true })).toBeVisible(); await expect(page.getByText('No Planner deep-work logs in this range', { exact: true })).toBeVisible(); await expect(page.getByText('No focus sessions recorded in this range. Start Focus to record your first session.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: test.info().outputPath('analytics-dark-empty.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('analytics-desktop-empty.png') });
});
test('dashboard filters, detail links, loading layout and analytics trend modes work', async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 320, height: 640 });
  await page.route('**/api/v1/dashboard*', async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
  await page.goto('/app/');
  await expect(page.getByRole('status', { name: 'Loading your dashboard...' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('group', { name: "Today's work filter" })).toBeVisible(); await page.unroute('**/api/v1/dashboard*');
  const filters = page.getByRole('group', { name: "Today's work filter" });
  expect(await page.getByRole('button', { name: 'Complete focus task', exact: true }).evaluate(button => {
    const reference = document.createElement('span'); reference.style.color = 'var(--text-on-accent)'; button.append(reference);
    const matches = getComputedStyle(button).color === getComputedStyle(reference).color; reference.remove(); return matches;
  })).toBe(true);
  await filters.getByRole('button', { name: /^Done / }).click(); await expect(page.getByText('No completed tasks yet.', { exact: true })).toBeVisible();
  await filters.getByRole('button', { name: /^Open / }).click();
  await page.getByRole('button', { name: 'Complete task Captured today', exact: true }).click(); await expect(page.getByRole('button', { name: 'Open task Captured today', exact: true })).toBeHidden();
  await filters.getByRole('button', { name: /^Done / }).click(); await page.getByRole('button', { name: 'Open task Captured today', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board\?task=/); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByLabel('Directive Title *', { exact: true })).toHaveValue('Captured today');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await page.goto('/app/'); await page.setViewportSize({ width: 1440, height: 1000 }); await expect(page.getByRole('progressbar', { name: "Today's task completion" })).toBeVisible(); await page.screenshot({ path: test.info().outputPath('dashboard-crafted-desktop.png') });
  await page.goto('/app/analytics'); const trends = page.getByRole('group', { name: 'Task trend measure' });
  await expect(trends.getByRole('button', { name: 'Daily', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await trends.getByRole('button', { name: '7-day rolling', exact: true }).click(); await expect(page.getByText('Rolling 7-day count, including days before the selected range.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '90 days', exact: true }).click(); await expect(page.getByText('View daily data (90 days)', { exact: true })).toBeVisible();
  await page.getByText('View daily data (90 days)', { exact: true }).click(); await expect(page.getByRole('row')).toHaveCount(91);
  await expect(page.getByRole('region', { name: 'Current workspace snapshot' })).toContainText('As of today');
  await page.getByRole('button', { name: /Your active streaks/ }).click(); await expect(page).toHaveURL(/\/app\/habits/);
  await page.evaluate(() => localStorage.setItem('krama-theme', 'dark')); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/app/analytics');
  await expect(page.getByText('View daily data (30 days)', { exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: test.info().outputPath('analytics-crafted-dark.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(async () => {
    const chart = page.locator('[aria-label="Focus and Planner chart"]');
    const bounds = await chart.boundingBox();
    const bar = await chart.locator('.recharts-bar-rectangle path').last().boundingBox();
    return Boolean(bounds && bar && bar.x > bounds.x + bounds.width * 0.8);
  }).toBe(true);
  await page.screenshot({ path: test.info().outputPath('analytics-polished-dark-desktop.png') });
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: "Today's Focus", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText('Too Many Requests', { exact: true })).toHaveCount(0, { timeout: 15000 });
  await page.screenshot({ path: test.info().outputPath('dashboard-polished-dark-desktop.png') });
  await page.evaluate(() => localStorage.setItem('krama-theme', 'light'));
  await page.setViewportSize({ width: 920, height: 900 });
  await page.goto('/app/analytics');
  await expect(page.getByRole('heading', { name: 'Completed tasks', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(async () => {
    const chart = page.locator('[aria-label="Focus and Planner chart"]');
    const bounds = await chart.boundingBox();
    const bar = await chart.locator('.recharts-bar-rectangle path').last().boundingBox();
    return Boolean(bounds && bar && bar.x > bounds.x + bounds.width * 0.8);
  }).toBe(true);
  await expect(page.getByText('Too Many Requests', { exact: true })).toHaveCount(0, { timeout: 15000 });
  await page.screenshot({ path: test.info().outputPath('analytics-polished-tablet.png') });
});

test('focus history retains loaded rows after a failed next page and linked tasks open', async ({ page }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  await prisma.focusSession.createMany({ data: [
    { userId, workspaceId, taskId: task.id, startTime: new Date(`${today}T09:00:00Z`), duration: 60, completed: true, type: 'pomodoro' },
    { userId, workspaceId, taskId: task.id, startTime: new Date(`${today}T10:00:00Z`), duration: 60, completed: true, type: 'short_break' },
  ] });
  await login(page); await page.goto('/app/analytics'); await expect(page.getByText('Showing 20 of 27 sessions', { exact: true })).toBeVisible();
  const breaks = page.getByRole('listitem').filter({ has: page.getByText('Short break', { exact: true }) }); await expect(breaks).toHaveCount(1); await expect(breaks.getByRole('button', { name: 'View task' })).toHaveCount(0);
  await page.route('**/api/v1/analytics/focus-history**', route => new URL(route.request().url()).searchParams.has('cursor') ? route.fulfill({ status: 503, json: { message: 'Simulated next-page failure' } }) : route.continue());
  await page.getByRole('button', { name: 'Load more sessions', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Could not load more sessions' })).toBeVisible({ timeout: 15000 }); await expect(page.getByText('Showing 20 of 27 sessions', { exact: true })).toBeVisible();
  await page.unroute('**/api/v1/analytics/focus-history**'); await page.getByRole('button', { name: 'Try Again', exact: true }).click(); await expect(page.getByText('Showing 27 of 27 sessions', { exact: true })).toBeVisible(); await expect(breaks).toHaveCount(2);
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  await page.getByRole('button', { name: '7-day rolling', exact: true }).click();
  await page.getByText('View daily data (7 days)', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'View task', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByLabel('Directive Title *', { exact: true })).toHaveValue('Dashboard work renamed');
  await page.goBack();
  await expect(page.getByRole('button', { name: '7 days', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '7-day rolling', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table')).toBeVisible();
});

test('analytics charts retain the full date-axis width after responsive resizing', async ({ page }) => {
  const resizeTask = await json('POST', 'tasks', { title: 'Chart resize verification', scheduledDate: `${today}T12:00:00Z` }, 201);
  await json('PATCH', `tasks/${resizeTask.id}`, { status: 'DONE', version: resizeTask.version });
  await login(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/app/analytics');
  await expect(page.locator('.recharts-area-curve')).toBeVisible();
  for (const width of [1440, 920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => {
      const chart = await page.locator('[aria-label="Task velocity chart"]').boundingBox();
      const curve = await page.locator('.recharts-area-curve').boundingBox();
      return Boolean(chart && curve && curve.width > chart.width * 0.8 && curve.x + curve.width > chart.x + chart.width * 0.9);
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`analytics-settled-${width}.png`) });
  }
});

test.afterAll(async () => {
  if (!userId) { await api?.dispose(); return; }
  const { prisma } = await import('../../apps/server/src/prisma');
  const queues = await import('../../apps/server/src/queues');
  try {
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } }); expect(owner.email).toBe(email); expect(owner.name).toBe(marker);
    const owned = await prisma.workspace.findMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); expect(owned.length).toBe(workspaceIds.size);
    const documentIds = new Set((await prisma.document.findMany({ where: { space: { workspaceId: { in: [...workspaceIds] } } }, select: { id: true } })).map(d => d.id));
    for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.analyticsQueue, queues.embeddingQueue, queues.documentVersionQueue]) for (const job of await queue.getJobs(['waiting', 'delayed', 'failed', 'completed'])) if (job.data?.userId === userId || workspaceIds.has(job.data?.workspaceId) || documentIds.has(job.data?.documentId)) await job.remove();
    await prisma.timeBlock.deleteMany({ where: { userId } }); await prisma.workspace.deleteMany({ where: { id: { in: [...workspaceIds] }, createdBy: userId } }); await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0); console.log('Audit fixtures removed');
  } finally {
    await api.dispose();
  }
});

