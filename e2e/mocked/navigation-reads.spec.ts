import { test, expect } from '@playwright/test';
import { designFixture } from '../../scripts/media/example-workspace';

test('empty Inbox shortcuts fit the workspace and open the matching capture type', async ({ page, context }, testInfo) => {
  await designFixture(context, true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('krama.sidebar.collapsed', 'false'));
  await page.goto('/app/inbox');
  for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(theme => localStorage.setItem('krama-theme', theme), theme);
    await page.reload();
    const shortcuts = page.getByRole('group', { name: 'Capture suggestions', exact: true });
    await expect(shortcuts.getByRole('button')).toHaveCount(4);
    for (const [label, mode] of [['A task', 'Task'], ['A note', 'Note'], ['An idea', 'Idea'], ['A link', 'Link']]) {
      const shortcut = shortcuts.getByRole('button', { name: label, exact: true });
      await shortcut.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Quick capture', exact: true });
      await expect(dialog.getByRole('button', { name: mode, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(shortcut).toBeFocused();
    }
    const bounds = await shortcuts.evaluate(node => {
      const group = node.getBoundingClientRect();
      return { width: group.width, overflow: node.scrollWidth > node.clientWidth, targets: [...node.querySelectorAll('button')].map(button => { const box = button.getBoundingClientRect(); return { width: box.width, height: box.height }; }) };
    });
    expect(bounds.overflow).toBe(false);
    for (const target of bounds.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44); expect(target.width).toBeCloseTo(bounds.targets[0].width, 1); }
    await shortcuts.screenshot({ path: testInfo.outputPath(`shortcuts-${width}-${theme}.png`) });
  }
});

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
  await capture.getByRole('textbox', { name: 'Title', exact: true }).press('Enter');
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
