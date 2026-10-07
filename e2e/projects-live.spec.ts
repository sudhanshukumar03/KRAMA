import { test, expect, request as createRequest, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';

test.skip(process.env.KRAMA_PROJECTS_VERIFY !== '1', 'Live project checks require explicit opt-in');
const marker = `Projects Verification ${crypto.randomUUID()}`;
const email = `projects-verify-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString('hex');
let api: APIRequestContext, token = '', userId = '', workspaceId = '', secondaryId = '', secondaryProject: any, secondaryGoal: any;
const workspaceIds = new Set<string>();
async function call(method: string, path: string, data?: any, workspace = workspaceId) {
  return api.fetch(path, { method, data, timeout: 30000, headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspace } }).catch(() => { throw new Error(`${method} ${path}: transport failure`); });
}
async function json(method: string, path: string, data?: any, status = 200, workspace = workspaceId) {
  const response = await call(method, path, data, workspace); expect(response.status(), `${method} ${path}`).toBe(status); return response.json();
}
async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL(/\/app(?:\/|$)/);
  await page.evaluate((id: string) => localStorage.setItem('krama_active_workspace', id), workspaceId);
}
test.beforeAll(async () => {
  api = await createRequest.newContext({ baseURL: new URL('/api/v1/', process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000').href });
  const response = await api.post('auth/signup', { data: { name: marker, email, password } }).catch(() => { throw new Error('Signup transport failure'); });
  expect(response.status()).toBe(201);
  const auth = await response.json(); token = auth.accessToken; userId = auth.user.id;
  const workspaces = await json('GET', 'workspaces'); workspaceId = workspaces.find((w: any) => w.createdBy === userId).id; workspaceIds.add(workspaceId);
  const secondary = await json('POST', 'workspaces', { name: `${marker} secondary` }, 201); secondaryId = secondary.id; workspaceIds.add(secondaryId);
  secondaryProject = await json('POST', 'projects', { name: 'Secondary audit project' }, 201, secondaryId);
  secondaryGoal = await json('POST', 'goals', { title: 'Secondary audit goal', type: 'PERSONAL' }, 201, secondaryId);
});

test('project creation, editing, version conflict, ordering and task restoration', async () => {
  let project = await json('POST', 'projects', { name: 'Live audit initiative', problemStatement: 'Original scope', targetDate: '2026-12-15', metadata: { tags: ['audit'] } }, 201);
  const originalVersion = project.version;
  project = await json('PATCH', `projects/${project.id}`, { name: 'Updated live audit initiative', version: project.version });
  expect(project.problemStatement).toBe('Original scope'); expect(project.metadata.tags).toEqual(['audit']); expect(project.metadata.targetDate).toBe('2026-12-15');
  expect((await call('PATCH', `projects/${project.id}`, { name: 'Stale edit', version: originalVersion })).status()).toBe(409);
  project = await json('PATCH', `projects/${project.id}/reorder`, { position: 5, version: project.version }); expect(project.position).toBe(5);
  const task = await json('POST', 'tasks', { title: 'Audit task', projectId: project.id }, 201);
  const removedTask = await json('POST', 'tasks', { title: 'Previously deleted audit task', projectId: project.id }, 201);
  await json('DELETE', `tasks/${removedTask.id}`);
  await json('DELETE', `projects/${project.id}`);
  expect((await call('GET', `projects/${project.id}`)).status()).toBe(404);
  await json('POST', `projects/${project.id}/restore`);
  const tasks = await json('GET', 'tasks'); expect(tasks.some((t: any) => t.id === task.id)).toBe(true); expect(tasks.some((t: any) => t.id === removedTask.id)).toBe(false);
});

test('project reorder cannot use a body workspace outside the authorized header workspace', async () => {
  const { prisma } = await import('../apps/server/src/prisma');
  const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId, workspaceId: secondaryId } } });
  await prisma.workspaceMember.delete({ where: { id: member.id } });
  try {
    const response = await call('PATCH', `projects/${secondaryProject.id}/reorder`, { workspaceId: secondaryId, position: 9876, version: secondaryProject.version });
    expect([403, 404], 'A project outside the authorized workspace must be rejected').toContain(response.status());
  } finally { await prisma.workspaceMember.create({ data: member }); }
});

test('project creation rejects a goal from a workspace the caller cannot access', async () => {
  const { prisma } = await import('../apps/server/src/prisma');
  const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId, workspaceId: secondaryId } } });
  await prisma.workspaceMember.delete({ where: { id: member.id } });
  try {
    const response = await call('POST', 'projects', { name: 'Cross-workspace goal audit', goalId: secondaryGoal.id });
    expect([400, 403, 404], 'A foreign goal link must be rejected').toContain(response.status());
  } finally { await prisma.workspaceMember.create({ data: member }); }
});

test('undo project deletion restores its milestone', async () => {
  const project = await json('POST', 'projects', { name: 'Milestone restoration audit' }, 201);
  const milestone = await json('POST', 'planner/milestones', { title: 'Audit checkpoint', date: '2026-10-07', projectId: project.id }, 201);
  await json('DELETE', `projects/${project.id}`);
  const hidden = await json('GET', 'planner/week?start=2026-10-05&end=2026-10-11');
  expect(hidden.milestones.some((m: any) => m.id === milestone.id)).toBe(false);
  expect((await call('PATCH', `planner/milestones/${milestone.id}`, { completed: true })).status()).toBe(404);
  expect((await call('DELETE', `planner/milestones/${milestone.id}`)).status()).toBe(404);
  await json('POST', `projects/${project.id}/restore`);
  const week = await json('GET', 'planner/week?start=2026-10-05&end=2026-10-11');
  expect(week.milestones.some((m: any) => m.id === milestone.id), 'Undo should preserve project milestones').toBe(true);
  const detail = await json('GET', `projects/${project.id}`); expect(detail.milestones.some((m: any) => m.id === milestone.id)).toBe(true);
});

test('goal updates reject foreign/deleted goals and simultaneous writes conflict', async () => {
  let project = await json('POST', 'projects', { name: 'Concurrent project audit' }, 201);
  expect((await call('PATCH', `projects/${project.id}`, { goalId: secondaryGoal.id, version: project.version })).status()).toBe(400);
  const goal = await json('POST', 'goals', { title: 'Deleted goal fixture', type: 'PERSONAL' }, 201);
  await json('DELETE', `goals/${goal.id}`);
  expect((await call('POST', 'projects', { name: 'Deleted goal link', goalId: goal.id })).status()).toBe(400);
  const updates = await Promise.all([call('PATCH', `projects/${project.id}`, { name: 'Concurrent A', version: project.version }), call('PATCH', `projects/${project.id}`, { name: 'Concurrent B', version: project.version })]);
  expect(updates.map(r => r.status()).sort()).toEqual([200, 409]);
  project = await json('GET', `projects/${project.id}`);
  const moves = await Promise.all([call('PATCH', `projects/${project.id}/reorder`, { position: 10, version: project.version }), call('PATCH', `projects/${project.id}/reorder`, { position: 20, version: project.version })]);
  expect(moves.map(r => r.status()).sort()).toEqual([200, 409]);
});

test('project creation modal supports accessible fields, keyboard dismissal and small screens', async ({ page }) => {
  await json('POST', 'projects', { name: 'Browser audit initiative' }, 201);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL(/\/app(?:\/|$)/);
  await page.evaluate(id => localStorage.setItem('krama_active_workspace', id), workspaceId);
  await page.goto('/app/projects');
  await expect(page.getByText('Browser audit initiative', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'New Initiative', exact: true }).click();
  await expect(page.getByText('New Project', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/projects-live/project-create-mobile.png', fullPage: true });
  const geometry = await page.getByRole('dialog').evaluate(panel => { const box = panel.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: window.innerHeight }; });
  console.log(`Project modal bounds: ${JSON.stringify(geometry)}`);
  await expect.soft(page.getByRole('dialog', { name: 'New Project' })).toBeVisible({ timeout: 1000 });
  await expect.soft(page.getByLabel('Initiative Name', { exact: false })).toBeVisible({ timeout: 1000 });
  await page.getByRole('button', { name: 'Launch Initiative' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Launch Initiative' })).toBeVisible();
  await page.getByLabel('Initiative Name', { exact: false }).fill('Canceled draft');
  await page.keyboard.press('Escape'); await expect.soft(page.getByText('New Project', { exact: true })).toBeHidden({ timeout: 1000 });
  expect.soft(geometry.top, 'Dialog form must remain reachable on a narrow screen').toBeGreaterThanOrEqual(0);
  expect.soft(geometry.bottom, 'Dialog form must fit or provide a bounded scroll container').toBeLessThanOrEqual(geometry.height);
  await expect(page.getByRole('button', { name: 'New Initiative', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'New Initiative', exact: true }).click();
  await expect(page.getByLabel('Initiative Name', { exact: false })).toHaveValue('');
});

test('timeline, refresh-safe edits and project-linked Brain creation persist', async ({ page }) => {
  const project = await json('POST', 'projects', { name: 'Connected project fixture', problemStatement: 'Scope before edit' }, 201);
  await json('POST', 'planner/milestones', { title: 'Connected launch milestone', projectId: project.id, date: '2026-12-15' }, 201);
  await login(page); await page.goto(`/app/projects/${project.id}`);
  await page.getByRole('button', { name: /Timeline/ }).first().click();
  await expect(page.getByText('Connected launch milestone', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Initiative', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit Initiative Settings' });
  await edit.getByLabel('Initiative Name', { exact: false }).fill('Preserved project draft');
  const refreshed = page.waitForResponse(response => response.url().endsWith(`/api/v1/projects/${project.id}`) && response.request().method() === 'GET', { timeout: 10000 });
  await json('PATCH', `projects/${project.id}`, { problemStatement: 'Remote scope edit', version: project.version });
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await refreshed;
  await expect(edit.getByLabel('Initiative Name', { exact: false })).toHaveValue('Preserved project draft');
  const conflict = page.waitForResponse(response => response.url().endsWith(`/api/v1/projects/${project.id}`) && response.request().method() === 'PATCH');
  await edit.getByRole('button', { name: 'Save Initiative', exact: true }).click();
  expect((await conflict).status()).toBe(409);
  await expect(edit.getByLabel('Initiative Name', { exact: false })).toHaveValue('Preserved project draft');
  expect((await json('GET', `projects/${project.id}`)).problemStatement).toBe('Remote scope edit');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Edit Initiative', exact: true }).click();
  await expect(edit.getByLabel('Problem Statement / Technical Scope')).toHaveValue('Remote scope edit');
  await edit.getByLabel('Initiative Name', { exact: false }).fill('Preserved project draft');
  await edit.getByRole('button', { name: 'Save Initiative', exact: true }).click(); await expect(edit).toBeHidden();
  expect((await json('GET', `projects/${project.id}`)).name).toBe('Preserved project draft');
  await page.goto(`/app/brain?projectId=${project.id}`);
  const document = page.getByRole('dialog', { name: 'Create New Document' });
  await expect(document).toBeVisible();
  await expect(document.getByLabel('Link to Project (Optional)')).toHaveValue(project.id);
  await document.getByPlaceholder('e.g. System Architecture Spec, API Contract...').fill('Connected project document');
  await document.getByRole('button', { name: 'Create Document', exact: true }).click(); await expect(document).toBeHidden();
  const documents = await json('GET', 'documents');
  expect(documents.find((d: any) => d.title === 'Connected project document').projectId).toBe(project.id);
  await page.goto(`/app/projects/${project.id}`);
  await expect(page.getByText('Connected project document', { exact: true }).first()).toBeVisible();
  await page.goto(`/app/brain?projectId=${secondaryProject.id}`);
  await expect(page.getByText('This project is unavailable in the current workspace', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('list and detail failures expose a working retry', async ({ page }) => {
  const project = await json('POST', 'projects', { name: 'Recovery project fixture' }, 201);
  await login(page);
  let broken = true;
  await page.route('**/api/v1/projects', route => broken ? route.fulfill({ status: 503, json: { message: 'Audit unavailable' } }) : route.continue());
  await page.goto('/app/projects');
  await expect(page.getByText('Could not load projects', { exact: true })).toBeVisible({ timeout: 15000 });
  broken = false; await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByText('Recovery project fixture', { exact: true })).toBeVisible();
  let detailBroken = true;
  await page.route(`**/api/v1/projects/${project.id}`, route => detailBroken ? route.fulfill({ status: 503, json: { message: 'Audit detail unavailable' } }) : route.continue());
  await page.goto(`/app/projects/${project.id}`);
  await expect(page.getByText('Failed to Load Initiative Telemetry', { exact: true })).toBeVisible();
  detailBroken = false; await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByText('Recovery project fixture', { exact: true }).first()).toBeVisible();
});

test('authenticated reloads share one refresh and keep workspace navigation signed in', async ({ page }) => {
  await login(page);
  let refreshes = 0;
  page.on('request', request => { if (request.url().endsWith('/api/v1/auth/refresh')) refreshes++; });
  for (const path of ['/app/projects', '/app/brain', '/app/planner?mode=calendar&date=2026-10-07', '/app/projects']) {
    const before = refreshes;
    const loaded = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/me') && response.status() === 200);
    await page.goto(path); await loaded;
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toHaveCount(0);
    expect(refreshes - before, 'Each full reload must rotate the session only once').toBe(1);
    expect(new URL(page.url()).pathname).toMatch(/^\/app\//);
  }
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
