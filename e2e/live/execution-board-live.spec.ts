import { test, expect, request as createRequest, type APIRequestContext } from './fixtures';
import crypto from 'node:crypto';
import { reportingClock, shiftDay, validDayKey } from '../../apps/server/src/services/reportingTime';
test.describe.configure({ mode: 'serial' });
test.skip(process.env.KRAMA_EXECUTION_BOARD_VERIFY !== '1', 'Live checks require explicit opt-in');
const marker = `Execution Board Verification ${crypto.randomUUID()}`;
const email = `execution-board-verify-${crypto.randomUUID()}@example.invalid`;
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

test('rejects foreign/deleted links, self-links, dependency/parent cycles and invalid parents', async () => {
  const foreign = await json('POST', 'tasks', { title: 'Foreign task' }, 201, secondaryId); const project = await json('POST', 'projects', { name: 'Foreign project' }, 201, secondaryId);
  for (const data of [{ blockedById: foreign.id }, { parentTaskId: foreign.id }, { projectId: project.id }, { parentTaskId: 'bad-id' }, { assigneeId: crypto.randomUUID() }]) expect((await call('POST', 'tasks', { title: 'Invalid reference', ...data })).status()).toBe(400);
  const a = await json('POST', 'tasks', { title: 'Dependency root' }, 201); const b = await json('POST', 'tasks', { title: 'Dependency child', blockedById: a.id }, 201);
  expect((await call('PATCH', `tasks/${a.id}`, { blockedById: b.id, version: a.version })).status()).toBe(400); expect((await call('PATCH', `tasks/${a.id}`, { parentTaskId: a.id })).status()).toBe(400);
  const child = await json('POST', 'tasks', { title: 'Hierarchy child', parentTaskId: a.id }, 201); expect((await call('PATCH', `tasks/${a.id}`, { parentTaskId: child.id })).status()).toBe(400);
  await json('DELETE', `tasks/${b.id}`); expect((await call('POST', 'tasks', { title: 'Deleted dependency', blockedById: b.id })).status()).toBe(400);
  expect((await call('GET', `tasks/${foreign.id}`)).status()).toBe(404);
  const { prisma } = await import('../../apps/server/src/prisma'); await prisma.task.update({ where: { id: a.id }, data: { projectId: project.id, parentTaskId: foreign.id, blockedById: foreign.id } });
  const legacy = await json('GET', `tasks/${a.id}`); expect(legacy.project).toBeNull(); expect(legacy.blockedBy).toBeNull(); expect(legacy.parentTask).toBeNull(); expect(legacy.parentTaskId).toBeNull();
  expect((await json('GET', 'tasks')).find((t: any) => t.id === a.id).project).toBeNull();
  expect((await call('POST', `tasks/${b.id}/comments`, { content: 'Should be rejected' })).status()).toBe(404);
});
test('simultaneous reorder updates accept one version and reject the other', async () => {
  const item = await json('POST', 'tasks', { title: 'Concurrent reorder', status: 'BACKLOG' }, 201);
  const writes = await Promise.all([call('PATCH', `tasks/${item.id}/reorder`, { position: 100, version: item.version }), call('PATCH', `tasks/${item.id}/reorder`, { position: 200, version: item.version })]); expect(writes.map(r => r.status()).sort()).toEqual([200, 409]);
});
test('General Operations creates Review tasks with dates, zero estimates and retained failed drafts', async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 320, height: 640 }); await page.goto('/app/board'); await page.getByLabel('Filter by project').selectOption('operations'); await page.getByRole('button', { name: 'New Directive', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Directive' }); await dialog.getByLabel('Directive Title *', { exact: true }).fill('Review execution task'); await dialog.getByLabel('Column / Status').selectOption('REVIEW'); await dialog.getByLabel('Estimate (Minutes)').fill('0'); await dialog.getByLabel('Scheduled date', { exact: true }).fill(today); await dialog.getByLabel('Due date', { exact: true }).fill(shiftDay(today, 1));
  const bounds = await dialog.boundingBox(); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640); await dialog.screenshot({ path: test.info().outputPath('board-mobile-create.png') });
  await page.route('**/api/v1/tasks', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { message: 'Temporary test failure' } }) : route.continue()); await dialog.getByRole('button', { name: 'Create Directive', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('draft is retained'); await expect(dialog.getByLabel('Directive Title *', { exact: true })).toHaveValue('Review execution task');
  await page.getByRole('button', { name: 'Close toast', exact: true }).last().click(); await page.unroute('**/api/v1/tasks'); await dialog.getByRole('button', { name: 'Create Directive', exact: true }).click(); await expect(dialog).toBeHidden(); task = (await json('GET', 'tasks')).find((t: any) => t.title === 'Review execution task'); expect(task.projectId).toBeNull(); expect(task.estimateMinutes).toBe(0); expect(task.scheduledDate.slice(0, 10)).toBe(today); expect(task.status).toBe('REVIEW');
  await expect(page.getByRole('region', { name: 'Review column', exact: true }).getByText('Review execution task', { exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'New Directive', exact: true }).click(); await expect(dialog.getByLabel('Directive Title *', { exact: true })).toHaveValue(''); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
});
test('edit drafts survive remote changes and preserve zero estimates, comments and scheduling', async ({ page }) => {
  await login(page); await page.goto('/app/board'); await page.getByText('Review execution task', { exact: true }).first().click(); const dialog = page.getByRole('dialog', { name: 'Directive Details' }); await expect(dialog.getByLabel('Estimate (Minutes)')).toHaveValue('0'); await expect(dialog.getByLabel('Scheduled date', { exact: true })).toHaveValue(today);
  await dialog.getByLabel('Directive Title *', { exact: true }).fill('Unsaved execution draft'); const latest = await json('GET', `tasks/${task.id}`); await json('PATCH', `tasks/${task.id}`, { description: 'Remote edit', version: latest.version }); await expect(dialog.getByText(/This task changed elsewhere/)).toBeVisible(); await expect(dialog.getByLabel('Directive Title *', { exact: true })).toHaveValue('Unsaved execution draft');
  const conflict = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith(`/tasks/${task.id}`)); await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); expect((await conflict).status()).toBe(409); await expect(dialog.getByRole('alert')).toContainText('draft is retained'); await page.keyboard.press('Escape');
  await page.getByText('Review execution task', { exact: true }).first().click(); await dialog.getByLabel('Column / Status').selectOption('TODO'); await dialog.getByLabel('Add a comment').fill('Execution discussion'); await dialog.getByRole('button', { name: 'Send', exact: true }).click(); await expect(dialog.getByText('Execution discussion', { exact: true })).toBeVisible(); await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog).toBeHidden(); await page.reload(); task = await json('GET', `tasks/${task.id}`); expect(task.status).toBe('TODO'); expect(task.estimateMinutes).toBe(0); expect(task.scheduledDate.slice(0, 10)).toBe(today); expect(task.comments).toHaveLength(1);
});
test('pointer moves, action-menu ordering, drag cancellation and reload persistence work', async ({ page }) => {
  const first = await json('POST', 'tasks', { title: 'Ordering first', status: 'BACKLOG', priority: 'MEDIUM' }, 201); const second = await json('POST', 'tasks', { title: 'Ordering second', status: 'BACKLOG', priority: 'MEDIUM' }, 201);
  await login(page); await page.setViewportSize({ width: 1900, height: 1000 }); await page.goto('/app/board'); await page.getByLabel('Search directives').fill('Ordering'); await page.getByRole('button', { name: 'Actions for Ordering second', exact: true }).click(); await page.getByRole('button', { name: 'Move up', exact: true }).click(); await expect.poll(async () => (await json('GET', `tasks/${second.id}`)).position < (await json('GET', `tasks/${first.id}`)).position).toBe(true);
  await page.reload(); await page.getByLabel('Search directives').fill('Ordering'); const backlog = page.getByRole('region', { name: 'Backlog column', exact: true }); expect(await backlog.getByRole('button', { name: /Move directive Ordering/ }).allTextContents()).toHaveLength(2);
  const card = page.getByRole('button', { name: 'Move directive Ordering first', exact: true }); const target = page.getByRole('region', { name: 'Review column', exact: true }); await target.scrollIntoViewIfNeeded(); const cb = await card.boundingBox(); const tb = await target.boundingBox(); await page.mouse.move(cb!.x + 30, cb!.y + 75); await page.mouse.down(); await page.mouse.move(cb!.x + 42, cb!.y + 75, { steps: 3 }); await page.mouse.move(tb!.x + 60, tb!.y + 110, { steps: 15 }); await page.mouse.up(); await expect.poll(async () => (await json('GET', `tasks/${first.id}`)).status).toBe('REVIEW');
  await page.reload(); await page.getByLabel('Search directives').fill('Ordering'); await expect(page.getByRole('region', { name: 'Review column', exact: true }).getByText('Ordering first', { exact: true })).toBeVisible();
  const movedCard = page.getByRole('button', { name: 'Move directive Ordering first', exact: true });
  await movedCard.focus();
  await page.keyboard.press('Space');
  await expect(movedCard).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(movedCard).not.toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('Dragging was cancelled');
  await movedCard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Directive Details' })).toBeVisible();
});
test('archive, List and Calendar views, delete/Undo and subtask navigation remain usable', async ({ page }) => {
  if (!task) task = await json('POST', 'tasks', { title: 'Review execution task', status: 'TODO', scheduledDate: `${today}T12:00:00Z` }, 201);
  const canceled = await json('POST', 'tasks', { title: 'Canceled execution', status: 'CANCELED' }, 201); const parent = await json('POST', 'tasks', { title: 'Execution parent', status: 'TODO' }, 201); const child = await json('POST', 'tasks', { title: 'Execution subtask', parentTaskId: parent.id }, 201);
  await login(page); await page.goto('/app/board'); await page.getByRole('button', { name: /^Archive/ }).click(); await expect(page.getByRole('region', { name: 'Canceled column' }).getByText('Canceled execution', { exact: true })).toBeVisible();
  await page.getByText('Execution parent', { exact: true }).click(); const dialog = page.getByRole('dialog', { name: 'Directive Details' }); await dialog.getByRole('button', { name: 'Open subtask Execution subtask', exact: true }).click(); await expect(dialog.getByLabel('Directive Title *', { exact: true })).toHaveValue('Execution subtask'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'List', exact: true }).click(); await page.getByRole('button', { name: 'Review execution task', exact: true }).press('Enter'); await expect(dialog).toBeVisible(); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Calendar', exact: true }).click(); await expect(page.getByText('Dated directives in chronological order; undated work appears last.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click(); await page.getByRole('button', { name: 'Actions for Canceled execution', exact: true }).click(); await page.getByRole('button', { name: 'Delete', exact: true }).click(); await expect.poll(async () => (await call('GET', `tasks/${canceled.id}`)).status()).toBe(404); await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect.poll(async () => (await call('GET', `tasks/${canceled.id}`)).status()).toBe(200);
  await json('DELETE', `tasks/${parent.id}`); await expect(page.getByText('Execution subtask', { exact: true }).first()).toBeVisible(); expect((await json('GET', `tasks/${child.id}`)).parentTaskId).toBeNull();
  await page.evaluate(() => localStorage.setItem('krama-theme', 'dark')); await page.reload(); await expect(page.getByRole('heading', { name: 'Execution Board', exact: true })).toBeVisible(); await expect(page.getByRole('region', { name: 'To Do column' })).toBeVisible(); await page.screenshot({ path: test.info().outputPath('board-dark-desktop.png') });
});
test('board, archive, project and discussion failures expose retries', async ({ page }) => {
  await login(page); await page.route('**/api/v1/tasks', route => route.request().method() === 'GET' ? route.fulfill({ status: 503, json: { message: 'Test failure' } }) : route.continue()); await page.goto('/app/board'); await expect(page.getByText('Failed to load Execution Board', { exact: true })).toBeVisible({ timeout: 30000 }); await page.unroute('**/api/v1/tasks'); await page.getByRole('button', { name: 'Try Again', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Execution Board', exact: true })).toBeVisible();
  await page.route('**/api/v1/tasks?status=CANCELED', route => route.fulfill({ status: 503, json: { message: 'Test failure' } })); await page.reload(); await page.getByRole('button', { name: /^Archive/ }).click(); await expect(page.getByText('Could not load canceled tasks', { exact: true })).toBeVisible({ timeout: 30000 }); await page.unroute('**/api/v1/tasks?status=CANCELED'); await page.getByRole('button', { name: 'Try Again', exact: true }).click(); await expect(page.getByText('Could not load canceled tasks', { exact: true })).toBeHidden();
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


