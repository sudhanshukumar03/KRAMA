import { test, expect, request as createRequest, type APIRequestContext } from './fixtures';
import crypto from 'node:crypto';
test.describe.configure({ mode: 'serial' });
test.skip(process.env.KRAMA_UI_RESTORATION_VERIFY !== '1', 'Live checks require explicit opt-in');
const marker = `UI Restoration Verification ${crypto.randomUUID()}`;
const email = `ui-restoration-verify-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString('hex');
let api: APIRequestContext, token = '', userId = '', workspaceId = '', secondaryId = '';
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
});

test('previous presentation, navigation and Escape behavior remain usable', async ({ page }) => {
  await login(page);
  await expect(page.locator('main h1')).toContainText(/Good/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: /Sign Out/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: /Focus Mode Active/ })).toHaveCount(0);
  const sections = [
    ['Dashboard', /Good/], ['Analytics', 'Analytics'], ['Execution Board', 'Execution Board'],
    ['Planner', 'Planner'], ['Goals', 'Life Aspirations & Goals'],
    ['Habits', 'Habits & Daily Architecture'], ['Projects', 'Projects & Strategic Initiatives'], ['Brain Workspace', 'Brain Workspace'],
  ] as const;
  for (const [link, title] of sections) {
    await page.getByRole('link', { name: new RegExp('^' + link) }).click();
    await expect(page.locator('main h1')).toContainText(title);
    await expect(page.locator('.workspace-topbar')).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: 'Create New Spec', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 920, height: 700 });
  await page.screenshot({ path: test.info().outputPath('brain-restored-2026-10-07.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const navigation = page.getByRole('dialog', { name: 'Workspace navigation' });
  await expect(navigation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(navigation).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Focus Mode Active/ })).toHaveCount(0);
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

