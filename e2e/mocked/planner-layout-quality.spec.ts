import { test, expect } from '@playwright/test';
import { designFixture } from '../../scripts/media/example-workspace';

for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`Planner task titles and keyboard actions remain readable at ${width}px in ${theme}`, async ({ page, context }, info) => {
    await designFixture(context);
    await context.addInitScript(value => localStorage.setItem('krama-theme', value), theme);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-10-17T09:30:00Z'));
    await page.goto('/app/planner?mode=day&date=2026-10-17');
    const title = page.getByRole('button', { name: 'Refine the portfolio case study', exact: true });
    await expect(title).toBeVisible();
    expect(await title.locator('span').first().evaluate(node => node.scrollWidth <= node.clientWidth), 'task title is visually clipped').toBe(true);
    const card = title.locator('..').locator('..');
    const block = card.getByRole('button', { name: 'Time Block', exact: true });
    await block.focus();
    expect(await block.evaluate(node => {
      for (let element: Element | null = node; element; element = element.parentElement) {
        if (Number(getComputedStyle(element).opacity) === 0) return false;
      }
      return true;
    }), 'focused task action is transparent').toBe(true);
    const geometry = await card.locator('button').evaluateAll(nodes => nodes.map(node => ({
      label: node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent,
      width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
    })));
    expect(geometry.filter(target => target.width < 43.5 || target.height < 43.5)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await info.attach(`planner-task-${width}-${theme}`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('historical Planner labels use the selected calendar day', async ({ page, context }) => {
  await designFixture(context);
  await page.clock.setFixedTime(new Date('2026-10-20T09:30:00Z'));
  await page.goto('/app/planner?mode=day&date=2026-10-17');
  const task = page.getByRole('button', { name: 'Refine the portfolio case study', exact: true });
  await expect(task.getByText('Scheduled Oct 17', { exact: true })).toBeVisible();
  await expect(task.getByText('Due Oct 17', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Tasks for Oct 17/ })).toBeVisible();
});

for (const theme of ['light', 'dark']) test(`large Planner lists retain keyboard paging and full backlog search in ${theme}`, async ({ page, context }) => {
  await designFixture(context);
  await context.addInitScript(value => localStorage.setItem('krama-theme', value), theme);
  await page.clock.setFixedTime(new Date('2026-10-17T09:30:00Z'));
  const tasks = Array.from({ length: 450 }, (_, index) => ({ id: `planner-task-${index}`, title: index < 150 ? `Planned task ${index}` : index < 300 ? `Backlog task ${index}` : `Carried task ${index}`,
    status: 'TODO', priority: 'NONE', version: 1, position: index, estimateMinutes: 25, metadata: {},
    scheduledDate: index < 150 ? '2026-10-17T12:00:00Z' : index < 300 ? null : '2026-10-16T12:00:00Z',
  }));
  await page.route(url => url.pathname === '/api/v1/tasks', route => route.fulfill({ json: tasks }));
  await page.route('**/api/v1/planner/week*', route => route.fulfill({ json: {
    tasks, timeBlocks: [], milestones: [], routines: [], occurrences: [], days: [], projects: [], goalDeadlines: [],
    capacity: { weeklyCapacityMinutes: 2400, occupiedMinutes: 0, meetingMinutes: 0, otherMinutes: 0, freeMinutes: 2400 }, config: { countryCode: 'IN' },
  } }));
  await page.goto('/app/planner?mode=day&date=2026-10-17');
  const planned = page.getByRole('button', { name: /^Planned task \d+$/ });
  await expect(page.getByRole('button', { name: /^Carried task \d+$/ })).toHaveCount(50);
  await expect(planned).toHaveCount(50);
  await page.getByRole('button', { name: 'Next day tasks', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Planned task 0', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Planned task 50', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'day tasks', exact: true }).getByRole('button', { name: 'Mark task complete', exact: true }).first()).toBeFocused();
  await page.getByRole('button', { name: 'Next day tasks', exact: true }).click();
  const lastTask = page.getByRole('button', { name: 'Planned task 149', exact: true });
  await lastTask.scrollIntoViewIfNeeded();
  await expect(lastTask).toBeInViewport();
  await page.getByRole('button', { name: /^Backlog/ }).click();
  await expect(page.getByRole('button', { name: /^Backlog task \d+$/ })).toHaveCount(50);
  await expect(page.getByRole('button', { name: 'Backlog task 150', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search backlog tasks', exact: true }).fill('Backlog task 299');
  await expect(page.getByRole('button', { name: 'Backlog task 299', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Backlog task \d+$/ })).toHaveCount(1);
});
