import { test, expect } from '@playwright/test';
import { bugFixture } from '../fixtures/current-bug-fixture';

const retainedTask = { id: 'retained-dashboard-task', title: 'A task retained through refresh failure', status: 'TODO', priority: 'HIGH', scheduledDate: '2026-10-17T12:00:00Z' };
const dashboard = (totalTasks = 1) => ({ dateKey: '2026-10-17', stats: { totalTasks }, today: { tasks: [retainedTask] }, habits: [], projects: [], goals: [], activity: [] });

test('Refresh gives real progress and completion, keeps its size and accepts a second keyboard refresh', async ({ page, context }) => {
  await bugFixture(context);
  let calls = 0;
  let release = () => {};
  await context.route('**/api/v1/dashboard', async route => {
    calls += 1;
    if (calls > 1) await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: dashboard(calls) });
  });
  await page.goto('/app/');
  const button = page.getByRole('button', { name: 'Refresh dashboard metrics', exact: true });
  await expect(button).toHaveText('Refresh dashboard');
  const initial = await button.boundingBox();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveText('Refreshing…');
  await expect(button).toHaveAttribute('aria-busy', 'true');
  expect(await button.locator('.dashboard-refresh-icon').evaluate(el => getComputedStyle(el).animationName)).toBe('dashboard-refresh-turn');
  await expect.poll(() => calls).toBe(2);
  await page.keyboard.press('Enter');
  expect(calls).toBe(2);
  release();
  await expect(button).toHaveText('Up to date');
  await expect(button).toBeFocused();
  expect((await button.boundingBox())?.width).toBe(initial?.width);
  await expect(page.getByRole('status').filter({ hasText: 'Dashboard is up to date.' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect.poll(() => calls).toBe(3);
  await expect(button).toHaveText('Refreshing…');
  release();
  await expect(button).toHaveText('Up to date');
  await expect(button).toHaveText('Refresh dashboard', { timeout: 5000 });
});

test('Failed refresh retains dashboard data and offers a working retry', async ({ page, context }) => {
  await bugFixture(context);
  let broken = false;
  await context.route('**/api/v1/dashboard', route => route.fulfill(broken
    ? { status: 503, json: { message: 'Synthetic refresh outage' } }
    : { json: dashboard() }));
  await page.goto('/app/');
  const button = page.getByRole('button', { name: 'Refresh dashboard metrics', exact: true });
  await expect(button).toBeVisible();
  broken = true;
  await button.click();
  await expect(button).toHaveText('Try again', { timeout: 15000 });
  await expect(page.getByRole('alert').filter({ hasText: 'Showing the previous data' })).toBeVisible();
  await expect(page.getByText(retainedTask.title, { exact: true }).first()).toBeVisible();
  broken = false;
  await button.click();
  await expect(button).toHaveText('Up to date');
  await expect(page.getByRole('alert').filter({ hasText: 'Showing the previous data' })).toHaveCount(0);
});

test('Reduced motion keeps refreshing feedback without rotation or sweep', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bugFixture(context);
  let calls = 0;
  let release = () => {};
  await context.route('**/api/v1/dashboard', async route => {
    if (++calls > 1) await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: dashboard() });
  });
  await page.goto('/app/');
  const button = page.getByRole('button', { name: 'Refresh dashboard metrics', exact: true });
  await button.click();
  await expect(button).toHaveText('Refreshing…');
  expect(await button.locator('.dashboard-refresh-icon').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(button.locator('.dashboard-refresh-sweep')).toBeHidden();
  await expect.poll(() => calls).toBe(2);
  release();
  await expect(button).toHaveText('Up to date');
});

test('Refresh fits small and large screens in both themes', async ({ page, context }, testInfo) => {
  await bugFixture(context);
  await page.goto('/app/');
  const button = page.getByRole('button', { name: 'Refresh dashboard metrics', exact: true });
  await expect(button).toBeVisible();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      const bounds = await button.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      if (testInfo.project.name === 'chromium' && width !== 768) {
        await button.locator('xpath=ancestor::header').screenshot({ path: `.audit/dashboard-refresh-${width}-${theme}.png` });
      }
    }
  }
});
