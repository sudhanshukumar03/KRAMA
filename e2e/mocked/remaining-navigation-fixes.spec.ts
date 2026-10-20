// Global search and goal history regressions with synthetic API responses.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bugFixture } from '../fixtures/current-bug-fixture';

test('Global search retains the latest results after a delayed earlier response', async ({ page, context }) => {
  await bugFixture(context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let oldStarted = false;
  let oldFinished = false;
  await context.route('**/api/v1/search?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === 'old') { oldStarted = true; await gate; }
    await route.fulfill({ json: { results: [{ id: query, type: 'issue', title: `${query} result`, snippet: 'Synthetic search result', url: `/app/board?task=${query}` }] } }).catch(() => {});
    if (query === 'old') oldFinished = true;
  });
  await page.goto('/app/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = page.locator('input[cmdk-input]');
  await input.fill('old'); await expect.poll(() => oldStarted).toBe(true);
  await input.fill('new');
  await expect(page.getByText('new result', { exact: true })).toBeVisible();
  release();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.getByText('old result', { exact: true })).toHaveCount(0);
  await expect(input).toHaveValue('new');
  await expect(page.getByText('new result', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/task=new$/);
});

test('Global search exposes a service failure and retries without losing the query', async ({ page, context }) => {
  await bugFixture(context);
  let broken = true;
  await context.route('**/api/v1/search?*', route => route.fulfill({ status: broken ? 503 : 200, json: broken ? { message: 'Synthetic search outage' } : { results: [] } }));
  await page.goto('/app/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const failed = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/search') && response.status() === 503);
  await page.locator('input[cmdk-input]').fill('missing');
  await failed;
  await expect(page.locator('[cmdk-root] svg.animate-spin')).toHaveCount(0);
  await expect(page.locator('[cmdk-root]').getByRole('alert')).toContainText('Search is unavailable');
  await expect(page.locator('[cmdk-root] [cmdk-empty]')).toHaveCount(0);
  broken = false;
  await page.getByRole('button', { name: 'Retry search', exact: true }).click();
  await expect(page.locator('input[cmdk-input]')).toHaveValue('missing');
  await expect(page.locator('[cmdk-root]').getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('No results. Try a different title or a few words from your notes.', { exact: true })).toBeVisible();
});

test('Global search contains keyboard focus and restores its opener on Escape', async ({ page, context }) => {
  await bugFixture(context);
  await page.goto('/app/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  const opener = page.getByRole('button', { name: 'Capture something', exact: true });
  await opener.focus();
  await page.keyboard.press('Control+k');
  const input = page.locator('input[cmdk-input]');
  await expect(input).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press(i % 2 ? 'Tab' : 'Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[cmdk-root]')))).toBe(true);
  }
  await expect(input).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('Browser Back closes the goal drawer and Forward restores it', async ({ page, context }) => {
  await bugFixture(context);
  const backup = JSON.parse(readFileSync('e2e/fixtures/personal-backup.json', 'utf8'));
  const goal = { ...backup.workspace.goals[0], id: 'history-goal', title: 'History navigation goal', parentGoalId: null, childGoals: [], snapshots: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  await context.route('**/api/v1/goals**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/goals/history-goal') ? goal : [goal] }));
  await page.goto('/app/goals');
  await page.getByRole('button', { name: 'Open Cockpit for History navigation goal', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Goal details', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/goal=history-goal/);
  const drawer = page.getByRole('dialog', { name: 'Goal details', exact: true });
  await drawer.getByRole('button', { name: 'Edit Settings', exact: true }).click();
  await drawer.getByLabel('Goal title', { exact: true }).fill('Keep this unsaved goal draft');
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/goals$/);
  await expect(page.getByRole('dialog', { name: 'Goal details', exact: true })).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('dialog', { name: 'Goal details', exact: true })).toBeVisible();
  await expect(page.getByLabel('Goal title', { exact: true })).toHaveValue('Keep this unsaved goal draft');
});

test('Clearing or closing global search retires pending responses', async ({ page, context }) => {
  await bugFixture(context);
  const release = new Map<string, () => void>();
  const finished = new Set<string>();
  await context.route('**/api/v1/search?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q')!;
    await new Promise<void>(resolve => release.set(query, resolve));
    await route.fulfill({ json: { results: [{ id: query, type: 'issue', title: `${query} result`, url: '/app/board' }] } }).catch(() => {});
    finished.add(query);
  });
  await page.goto('/app/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = page.locator('input[cmdk-input]');
  await input.fill('cleared'); await expect.poll(() => release.has('cleared')).toBe(true);
  await input.fill(''); release.get('cleared')!();
  await expect.poll(() => finished.has('cleared')).toBe(true);
  await expect(page.getByText('cleared result', { exact: true })).toHaveCount(0);
  await input.fill('closed'); await expect.poll(() => release.has('closed')).toBe(true);
  await page.keyboard.press('Escape'); release.get('closed')!();
  await expect.poll(() => finished.has('closed')).toBe(true);
  await page.keyboard.press('Control+k');
  await expect(input).toHaveValue('');
  await expect(page.getByText('closed result', { exact: true })).toHaveCount(0);
});
