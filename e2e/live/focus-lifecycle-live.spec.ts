import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function prepare(page: Page, account: any, minutes: number, start: Date) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(start);
  const task = await account.call('POST', 'tasks', { title: 'Focus lifecycle verification', status: 'TODO', estimateMinutes: minutes, scheduledDate: day + 'T12:00:00Z' }, 201);
  await account.signIn(page); await page.goto(`/focus?task=${task.id}&date=${day}`);
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await expect(setup).toBeVisible(); await setup.getByLabel('Session plan').selectOption('continuous');
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await page.clock.install({ time: start });
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('Space');
  return task;
}
async function sessions(taskId: string) {
  const { prisma } = await import('../../apps/server/src/prisma');
  return prisma.focusSession.findMany({ where: { taskId }, orderBy: { startTime: 'asc' } });
}

test('two-hour Focus survives suspended timers and a background tab without duplicate work', async ({ page, context, account }) => {
  const task = await prepare(page, account, 120, new Date(Date.now() - 4 * 3600000));
  const other = await context.newPage(); await other.goto('/app'); await other.bringToFront();
  // One timer callback after a long gap models browser throttling / OS sleep.
  await page.clock.fastForward(130 * 60000); await page.bringToFront();
  await expect(page.getByRole('dialog', { name: 'Is this task done?' })).toBeVisible();
  await expect.poll(async () => (await sessions(task.id)).length).toBe(1);
  expect((await sessions(task.id))[0].duration).toBe(7200);
  await page.clock.fastForward(600000); await page.reload();
  expect(await sessions(task.id)).toHaveLength(1); await other.close();
});

test('a long paused interval adds no work time', async ({ page, account }) => {
  const task = await prepare(page, account, 2, new Date(Date.now() - 5 * 3600000));
  await page.clock.runFor(30000); await page.keyboard.press('Space');
  await page.clock.fastForward(2 * 3600000);
  await expect(page).toHaveTitle(/01:30/);
  await page.keyboard.press('Space'); await page.clock.fastForward(90000);
  await expect(page.getByRole('dialog', { name: 'Is this task done?' })).toBeVisible();
  const saved = (await sessions(task.id))[0]; expect(saved.duration).toBe(120);
  expect(saved.endTime).not.toBeNull();
  expect(Math.abs(+saved.endTime! - +saved.startTime - (2 * 3600000 + 120000))).toBeLessThan(1000);
});

test('crossing local midnight retains the original task and exact session timestamps', async ({ page, account }) => {
  // Keep the whole synthetic session in the past even when CI runs before 00:15.
  const pastDay = new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const start = new Date(pastDay + 'T23:55:00+05:30');
  const task = await prepare(page, account, 20, start);
  await page.clock.fastForward(20 * 60000);
  await expect(page.getByRole('dialog', { name: 'Is this task done?' })).toBeVisible();
  const saved = (await sessions(task.id))[0]; expect(saved.duration).toBe(1200);
  expect(Math.abs(+saved.startTime - +start)).toBeLessThan(1000);
  expect(saved.endTime).not.toBeNull();
  expect(Math.abs(+saved.endTime! - (+start + 1200000))).toBeLessThan(1000);
});

test('expired login retains an unsaved completion and saves it once after signing in', async ({ page, context, account }) => {
  const task = await prepare(page, account, 1, new Date(Date.now() - 180000));
  // Reject the access token as an expired token; the real refresh endpoint then
  // receives no cookie and rejects renewal. All other requests use the real API.
  await context.clearCookies();
  await page.route('**/api/v1/focus-sessions', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 401, json: { message: 'Access token expired' } }) : route.continue());
  await page.clock.fastForward(60000); await expect(page).toHaveURL(/\/login/);
  const scope = `krama.focus.unsaved.${account.userId}.${account.workspaceId}.completion.`;
  const retained = await page.evaluate(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => JSON.parse(localStorage.getItem(key)!)), scope);
  expect(retained).toHaveLength(1); expect(retained[0].duration).toBe(60);
  await page.clock.resume();
  await page.unroute('**/api/v1/focus-sessions'); await account.signIn(page);
  await page.goto('/focus');
  await page.getByRole('button', { name: 'Retry saving session', exact: true }).click();
  await expect.poll(async () => (await sessions(task.id)).length).toBe(1);
  expect((await sessions(task.id))[0].id).toBe(retained[0].completionId);
  await expect.poll(() => page.evaluate(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).length, scope)).toBe(0);
});
