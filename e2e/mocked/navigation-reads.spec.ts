import { test, expect } from '@playwright/test';
import { designFixture } from '../../scripts/media/example-workspace';

test('navigation badges and command suggestions do not download unrelated collections', async ({ page, context }) => {
  await designFixture(context);
  const reads: string[] = [];
  page.on('request', request => { if (request.method() === 'GET' && request.url().includes('/api/v1/')) reads.push(new URL(request.url()).pathname.replace('/api/v1', '')); });
  await page.goto('/app/habits');
  await expect(page.getByRole('heading', { name: 'Habits', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tasks 3', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(reads.filter(path => ['/tasks', '/documents', '/projects', '/search/recent'].includes(path))).toEqual([]);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await expect(dialog.getByText('Recent documents', { exact: true })).toBeVisible();
  expect(reads.filter(path => ['/tasks', '/documents', '/projects'].includes(path))).toEqual([]);
  expect(reads.filter(path => path === '/search/recent')).toHaveLength(1);
  await dialog.getByRole('combobox').fill('Planner');
  await expect(dialog.getByRole('option', { name: 'Planner', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/planner$/);
});

test('a successful capture refreshes navigation counts through the shared write boundary', async ({ page, context }) => {
  await designFixture(context);
  let summaryReads = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/v1/workspaces/summary') summaryReads++; });
  await page.goto('/app/inbox');
  await expect(page.getByRole('link', { name: 'Tasks 3', exact: true })).toBeVisible();
  const before = summaryReads;
  await page.getByRole('button', { name: 'Capture something', exact: true }).click();
  const capture = page.getByRole('dialog', { name: 'Quick capture', exact: true });
  await capture.getByRole('textbox', { name: 'Title', exact: true }).fill('A new captured task');
  await capture.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Tasks 4', exact: true })).toBeVisible();
  expect(summaryReads).toBeGreaterThan(before);
});

test('Escape closes search above the assistant before closing the assistant', async ({ page, context }) => {
  await designFixture(context);
  await page.goto('/app/habits');
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  const assistantInput = page.getByRole('textbox', { name: 'Ask KRAMA AI Assistant', exact: true });
  await expect(assistantInput).toBeFocused();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await expect(search).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toBeHidden();
  await expect(assistantInput).toBeVisible();
  await expect(assistantInput).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(assistantInput).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open AI Assistant', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Focus Mode Active ESC' })).toHaveCount(0);
});
