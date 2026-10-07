import { test, expect, request as createRequest, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';

test.skip(process.env.KRAMA_GOALS_HABITS_VERIFY !== '1', 'Live project checks require explicit opt-in');
const marker = `Goals Habits Verification ${crypto.randomUUID()}`;
const email = `goals-habits-verify-${crypto.randomUUID()}@example.invalid`;
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

test('rejects foreign/deleted goal links, parent cycles and conflicting workspace scope', async () => {
  const root = await json('POST', 'goals', { title: 'Hierarchy root', type: 'quarterly' }, 201);
  const child = await json('POST', 'goals', { title: 'Hierarchy child', type: 'monthly', parentGoalId: root.id }, 201);
  expect((await call('POST', 'goals', { title: 'Foreign child', type: 'monthly', parentGoalId: secondaryGoal.id })).status()).toBe(400);
  expect((await call('PATCH', `goals/${root.id}`, { parentGoalId: child.id })).status()).toBe(400);
  expect((await call('POST', 'habits', { name: 'Foreign habit link', linkedGoalId: secondaryGoal.id })).status()).toBe(400);
  expect((await call('POST', 'goals', { title: 'Mismatch', type: 'monthly', workspaceId: secondaryId })).status()).toBe(403);
  expect((await call('POST', 'habits', { name: 'Mismatch', workspaceId: secondaryId })).status()).toBe(403);
  await json('DELETE', `goals/${child.id}`);
  expect((await call('POST', 'goals', { title: 'Deleted parent', type: 'monthly', parentGoalId: child.id })).status()).toBe(400);
  expect((await call('POST', 'habits', { name: 'Deleted goal', linkedGoalId: child.id })).status()).toBe(400);
});

test('simultaneous goal and habit edits accept one version and reject the other', async () => {
  const goal = await json('POST', 'goals', { title: 'Concurrent goal', type: 'monthly', metadata: { color: 'green' } }, 201);
  const results = await Promise.all([call('PATCH', `goals/${goal.id}`, { title: 'Writer A', version: goal.version }), call('PATCH', `goals/${goal.id}`, { title: 'Writer B', version: goal.version })]);
  expect(results.map(r => r.status()).sort()).toEqual([200, 409]);
  const habit = await json('POST', 'habits', { name: 'Concurrent habit', metadata: { customField: 'retained' }, timeOfDay: 'evening' }, 201);
  expect(habit.metadata.customField).toBe('retained');
  const writes = await Promise.all([call('PATCH', `habits/${habit.id}`, { name: 'Habit A', version: habit.version }), call('PATCH', `habits/${habit.id}`, { name: 'Habit B', version: habit.version })]);
  expect(writes.map(r => r.status()).sort()).toEqual([200, 409]);
  const loaded = await json('GET', `habits/${habit.id}`); expect(loaded.metadata.customField).toBe('retained'); expect(loaded.timeOfDay).toBe('evening');
});

test('weighted progress, moving children, last-child deletion and deep Undo stay consistent', async () => {
  const root = await json('POST', 'goals', { title: 'Rollup root', type: 'quarterly' }, 201);
  const other = await json('POST', 'goals', { title: 'Other rollup root', type: 'quarterly' }, 201);
  let child = await json('POST', 'goals', { title: 'Weighted child', type: 'monthly', parentGoalId: root.id, progress: 100, metadata: { weight: 1 } }, 201);
  const zero = await json('POST', 'goals', { title: 'Zero child', type: 'monthly', parentGoalId: root.id, progress: 0 }, 201);
  expect((await json('GET', `goals/${root.id}`)).progress).toBe(50);
  child = await json('PATCH', `goals/${child.id}`, { metadata: { weight: 3 }, version: child.version });
  expect((await json('GET', `goals/${root.id}`)).progress).toBe(75);
  child = await json('PATCH', `goals/${child.id}`, { parentGoalId: other.id, version: child.version });
  expect((await json('GET', `goals/${root.id}`)).progress).toBe(0); expect((await json('GET', `goals/${other.id}`)).progress).toBe(100);
  await json('DELETE', `goals/${child.id}`); expect((await json('GET', `goals/${other.id}`)).progress).toBe(0);
  await json('POST', `goals/${child.id}/restore`); expect((await json('GET', `goals/${other.id}`)).progress).toBe(100);
  await json('DELETE', `goals/${zero.id}`);
  let parent = root; const descendants: any[] = [];
  for (let n = 0; n < 4; n++) { parent = await json('POST', 'goals', { title: `Deep ${n}`, type: 'monthly', parentGoalId: parent.id }, 201); descendants.push(parent); }
  await json('DELETE', `goals/${root.id}`);
  for (const item of descendants) expect((await call('GET', `goals/${item.id}`)).status()).toBe(404);
  await json('POST', `goals/${root.id}/restore`);
  for (const item of descendants) expect((await call('GET', `goals/${item.id}`)).status()).toBe(200);
  expect((await call('GET', `goals/${zero.id}`)).status()).toBe(404);
});

test('habit dates, duplicate checkoffs and delete/Undo preserve history', async () => {
  const habit = await json('POST', 'habits', { name: 'Completion dates', cadence: 'daily', scheduledDays: [1] }, 201);
  expect((await call('POST', `habits/${habit.id}/log`, { date: '2026-02-30' })).status()).toBe(400);
  expect((await call('POST', `habits/${habit.id}/log`, { date: '2026-10-07', dateIso: '2026-10-06T12:00:00.000Z' })).status()).toBe(400);
  const writes = await Promise.all([call('POST', `habits/${habit.id}/log`, { date: '2026-10-07' }), call('POST', `habits/${habit.id}/log`, { date: '2026-10-07' })]);
  expect(writes.map(r => r.status()).sort()).toEqual([200, 400]);
  let loaded = await json('GET', `habits/${habit.id}`); expect(loaded.completions).toHaveLength(1); expect(loaded.completions[0].offSchedule).toBe(true);
  await json('DELETE', `habits/${habit.id}`); expect((await call('GET', `habits/${habit.id}`)).status()).toBe(404);
  await json('POST', `habits/${habit.id}/restore`); loaded = await json('GET', `habits/${habit.id}`); expect(loaded.completions).toHaveLength(1);
  await json('DELETE', `habits/${habit.id}/log?date=2026-10-07`); expect((await json('GET', `habits/${habit.id}`)).completions).toHaveLength(0);
});

test('shared habits show only the signed-in member’s completions and streak', async () => {
  const { prisma } = await import('../apps/server/src/prisma');
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const memberEmail = `goals-habits-member-${crypto.randomUUID()}@example.invalid`;
  const member = await prisma.user.create({ data: { name: `${marker} member`, email: memberEmail, passwordHash: owner.passwordHash, memberships: { create: { workspaceId, role: 'MEMBER' } } } });
  try {
    const authResponse = await api.post('auth/login', { data: { email: memberEmail, password } }); expect(authResponse.status()).toBe(200); const auth = await authResponse.json();
    const habit = await json('POST', 'habits', { name: 'Personal checkoffs', cadence: 'daily' }, 201);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    await json('POST', `habits/${habit.id}/log`, { date });
    const response = await api.get('habits', { headers: { Authorization: `Bearer ${auth.accessToken}`, 'x-workspace-id': workspaceId } }); expect(response.status()).toBe(200);
    const listed = (await response.json()).find((h: any) => h.id === habit.id); expect(listed.completions).toHaveLength(0); expect(listed.streak).toBe(0);
    const own = await json('GET', `habits/${habit.id}`); expect(own.completions).toHaveLength(1); expect(own.streak).toBe(1);
  } finally {
    const ownedMember = await prisma.user.findUniqueOrThrow({ where: { id: member.id } }); expect(ownedMember.email).toBe(memberEmail); expect(ownedMember.name).toBe(`${marker} member`);
    await prisma.user.delete({ where: { id: member.id } });
  }
});

test('goal and habit forms work on mobile, retain failed drafts and support Escape', async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/app/goals'); await page.getByRole('button', { name: 'New Aspiration', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'New Life Aspiration' }); await expect(dialog).toBeVisible(); await dialog.getByLabel('Aspiration / Goal Title').fill('Mobile draft');
  const box = await dialog.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  await dialog.screenshot({ path: test.info().outputPath('goal-mobile.png') });
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(page.getByRole('button', { name: 'New Aspiration', exact: true })).toBeFocused();
  await page.goto('/app/habits'); await page.getByRole('button', { name: 'Create Habit', exact: true }).first().click();
  dialog = page.getByRole('dialog', { name: 'Create New Routine / Habit' }); await expect(dialog).toBeVisible(); await dialog.getByLabel('Routine name').fill('Retained failed routine');
  await dialog.screenshot({ path: test.info().outputPath('habit-mobile.png') });
  await page.route('**/api/v1/habits', async route => { if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { message: 'Temporary test failure' } }); else await route.continue(); });
  await dialog.getByRole('button', { name: 'Create Habit', exact: true }).click(); await expect(page.getByText('Failed to create habit', { exact: true })).toBeVisible(); await expect(dialog.getByLabel('Routine name')).toHaveValue('Retained failed routine');
  await page.unroute('**/api/v1/habits'); await dialog.getByRole('button', { name: 'Create Habit', exact: true }).click(); await expect(dialog).toBeHidden();
  await page.reload(); await expect(page.getByText('Retained failed routine', { exact: true }).first()).toBeVisible();
});

test('goal drawer keeps an edit draft through a remote change and rejects stale saving', async ({ page }) => {
  const goal = await json('POST', 'goals', { title: 'Drawer verification', type: 'monthly' }, 201);
  await login(page); await page.goto('/app/goals'); await page.getByRole('button', { name: 'Drawer verification', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Goal details' }); await dialog.getByRole('button', { name: 'Edit Settings', exact: true }).last().click(); await dialog.getByLabel('Goal title').fill('Unsaved drawer draft');
  await json('PATCH', `goals/${goal.id}`, { title: 'Remote drawer title', version: goal.version }); await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(dialog.getByText(/This goal changed elsewhere/)).toBeVisible(); await expect(dialog.getByLabel('Goal title')).toHaveValue('Unsaved drawer draft');
  const conflict = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith(`/goals/${goal.id}`)); await dialog.getByRole('button', { name: 'Save Settings', exact: true }).click(); expect((await conflict).status()).toBe(409);
  await expect(dialog.getByLabel('Goal title')).toHaveValue('Unsaved drawer draft'); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
});

test('Goals and Habits failures offer a working retry', async ({ page }) => {
  await login(page);
  for (const section of ['goals', 'habits']) {
    let fail = true; await page.route(`**/api/v1/${section}`, route => fail ? route.fulfill({ status: 503, json: { message: 'Retry test failure' } }) : route.continue());
    await page.goto(`/app/${section}`); const retry = page.getByRole('button', { name: 'Try Again', exact: true }); await expect(retry).toBeVisible({ timeout: 15000 }); fail = false; await retry.click(); await expect(retry).toBeHidden(); await page.unroute(`**/api/v1/${section}`);
  }
});

test('automatic goal progress refreshes both goals when a completed task moves', async () => {
  const first = await json('POST', 'goals', { title: 'Automatic A', type: 'monthly', metadata: { progressMode: 'auto' } }, 201);
  const second = await json('POST', 'goals', { title: 'Automatic B', type: 'monthly', metadata: { progressMode: 'auto' } }, 201);
  const projectA = await json('POST', 'projects', { name: 'Automatic project A', goalId: first.id }, 201);
  const projectB = await json('POST', 'projects', { name: 'Automatic project B', goalId: second.id }, 201);
  const task = await json('POST', 'tasks', { title: 'Automatic task', projectId: projectA.id, status: 'DONE' }, 201);
  await expect.poll(async () => (await json('GET', `goals/${first.id}`)).progress).toBe(100);
  await json('PATCH', `tasks/${task.id}`, { projectId: projectB.id, version: task.version });
  await expect.poll(async () => (await json('GET', `goals/${first.id}`)).progress).toBe(0);
  await expect.poll(async () => (await json('GET', `goals/${second.id}`)).progress).toBe(100);
  const latest = await json('GET', `goals/${second.id}`);
  expect((await json('PATCH', `goals/${second.id}`, { progress: 5, version: latest.version })).progress).toBe(100);
  await json('DELETE', `tasks/${task.id}`); await expect.poll(async () => (await json('GET', `goals/${second.id}`)).progress).toBe(0);
  await json('POST', `tasks/${task.id}/restore`); await expect.poll(async () => (await json('GET', `goals/${second.id}`)).progress).toBe(100);
});

test('goal creation retains its draft on linked-data refresh and reports failed links honestly', async ({ page }) => {
  const project = await json('POST', 'projects', { name: 'Link failure project' }, 201);
  await login(page); await page.goto('/app/goals'); await page.getByRole('button', { name: 'New Aspiration', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New Life Aspiration' }); await dialog.getByLabel('Aspiration / Goal Title').fill('Partial goal creation'); await dialog.getByRole('checkbox', { name: 'Link failure project', exact: true }).check();
  await json('POST', 'habits', { name: 'Background habit refresh' }, 201); await expect(dialog.getByRole('checkbox', { name: 'Background habit refresh', exact: true })).toBeVisible(); await expect(dialog.getByLabel('Aspiration / Goal Title')).toHaveValue('Partial goal creation'); await expect(dialog.getByRole('checkbox', { name: 'Link failure project', exact: true })).toBeChecked();
  await page.route(`**/api/v1/projects/${project.id}`, route => route.request().method() === 'PATCH' ? route.fulfill({ status: 409, json: { message: 'Conflict: simulated link failure' } }) : route.continue());
  await dialog.getByRole('button', { name: 'Create Aspiration', exact: true }).click(); await expect(dialog).toBeHidden(); await expect(page.getByText('Goal created, but 1 links failed. Reopen Edit to retry.', { exact: true })).toBeVisible();
  expect((await json('GET', 'goals')).filter((g: any) => g.title === 'Partial goal creation')).toHaveLength(1); expect((await json('GET', `projects/${project.id}`)).goalId).toBeNull();
  await page.unroute(`**/api/v1/projects/${project.id}`); await page.getByRole('button', { name: 'Options for Partial goal creation', exact: true }).click(); await page.getByRole('button', { name: 'Edit Goal', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit Goal', exact: true }); await edit.getByRole('checkbox', { name: 'Link failure project', exact: true }).check(); await edit.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(edit).toBeHidden();
  expect((await json('GET', `projects/${project.id}`)).goalId).toBeTruthy(); expect((await json('GET', 'goals')).filter((g: any) => g.title === 'Partial goal creation')).toHaveLength(1);
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
