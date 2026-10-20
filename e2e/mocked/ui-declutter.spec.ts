import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { designFixture } from '../../scripts/media/example-workspace';

const root = '.audit/declutter';
const routes = [
  ['dashboard', '/app/'], ['inbox', '/app/inbox'], ['planner', '/app/planner?mode=day&date=2026-10-17'],
  ['goals', '/app/goals'], ['project', '/app/projects/design-project-0'], ['brain', '/app/brain?doc=design-doc-0'],
  ['habits', '/app/habits'], ['tasks', '/app/board'], ['projects', '/app/projects'],
] as const;

for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`clean workspace ${theme} at ${width}px keeps content and actions reachable`, async ({ page, context, browserName }) => {
    const artifacts = `${root}/${browserName}`;
    mkdirSync(artifacts, { recursive: true });
    await designFixture(context);
    await context.addInitScript(value => { localStorage.setItem('krama-theme', value); localStorage.setItem('krama.sidebar.collapsed', 'false'); }, theme);
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-10-17T09:30:00Z'));
    const errors: string[] = [];
    page.on('pageerror', error => {
      // The fixture deliberately aborts Socket.IO. WebKit can surface that
      // intercepted network abort as a page error, although no app script failed.
      if (/socket\.io\/.*due to access control checks\./.test(error.message)) return;
      errors.push(error.message);
    });
    const measurements = [];
    for (const [name, url] of routes) {
      await page.goto(url); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('#main-content')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const sidebarWidth = await page.locator('.krama-sidebar').evaluate(node => node.getBoundingClientRect().width);
      if (width >= 768) expect(sidebarWidth).toBe(248);
      const ai = page.getByRole('button', { name: 'Open AI Assistant', exact: true });
      await expect(ai).toBeVisible();
      if (width < 768) {
        expect(await ai.evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThan(80);
        await expect(page.locator('.krama-assistant-launcher')).toBeHidden();
      }
      if (name === 'dashboard') {
        await expect(page.getByLabel('Workspace summary', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('region', { name: 'Daily planning' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Start Focus for Refine portfolio case study', exact: true })).toHaveCount(0);
        await expect(page.getByText('Current focus', { exact: true })).toBeVisible();
      }
      if (name === 'planner') {
        await expect(page.getByText('Live Horizon', { exact: true })).toHaveCount(0);
        const opener = page.getByRole('button', { name: 'Add Time Block', exact: true });
        await opener.click();
        const dialog = page.getByRole('dialog').last(); await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
      }
      if (name === 'goals') {
        const filter = page.getByLabel('Filter by life pillar', { exact: true });
        await expect(filter).toBeVisible(); await filter.selectOption('career');
        await expect(page.getByText('Read twelve thoughtful books', { exact: true })).toHaveCount(0);
        await filter.selectOption('all');
      }
      if (name === 'project') {
        await expect(page.getByRole('heading', { name: 'Quick Actions', exact: true })).toHaveCount(0);
        await expect(page.getByText('Cadence & Velocity', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Task progress', exact: false })).toBeVisible();
        await expect(page.getByText('Bring my recent work together with a clear story and a considered presentation.', { exact: true })).toHaveCount(1);
        await expect(page.getByRole('tablist', { name: 'Project views' }).locator('kbd')).toHaveCount(0);
        measurements.push({ name, sidebarWidth });
      }
      if (name === 'brain') {
        const body = page.getByRole('textbox', { name: 'Document body', exact: true });
        await expect(body).toBeVisible();
        const top = await body.evaluate(node => node.getBoundingClientRect().top);
        if (width >= 390 && width < 768) expect(top).toBeLessThan(750);
        const properties = page.locator('.workspace-document-properties > summary');
        await expect(page.getByLabel('Linked project', { exact: true })).toBeHidden();
        await properties.focus(); await page.keyboard.press('Enter');
        await expect(page.getByLabel('Linked project', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Document type', { exact: true })).toBeVisible();
        await properties.focus(); await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'More document actions', exact: true }).click();
        await page.getByRole('button', { name: 'Create task from document', exact: true }).click();
        const taskDialog = page.getByRole('dialog').last(); await expect(taskDialog).toBeVisible();
        await page.keyboard.press('Escape'); await expect(taskDialog).toBeHidden();
        measurements.push({ name, sidebarWidth, bodyTop: top });
      }
      await page.screenshot({ path: `${artifacts}/${name}-${width}-${theme}.png`, animations: 'disabled' });
    }
    await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Close AI Assistant', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open AI Assistant', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open AI Assistant', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Focus Mode Active ESC' })).toHaveCount(0);
    expect(errors).toEqual([]);
    writeFileSync(`${artifacts}/measurements-${width}-${theme}.json`, JSON.stringify(measurements, null, 2));
  });
}

for (const theme of ['light', 'dark']) test(`empty workspace ${theme} offers a clear habit creation action`, async ({ page, context, browserName }) => {
  await designFixture(context, true);
  await context.addInitScript(value => localStorage.setItem('krama-theme', value), theme);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/habits'); await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'No habits created yet', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Habit time of day filter', exact: true })).toHaveCount(0);
  await expect(page.getByText('Atomic Habits', { exact: true })).toHaveCount(0);
  const opener = page.getByRole('button', { name: 'Create First Habit', exact: true });
  await opener.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog').last(); await expect(dialog).toBeVisible();
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab'); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
  await page.screenshot({ path: `${root}/${browserName}/habits-empty-390-${theme}.png` });
});
