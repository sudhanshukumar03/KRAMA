import { test, expect, type BrowserContext } from '@playwright/test';
import { bugFixture } from '../fixtures/current-bug-fixture';

test.use({ viewport: { width: 1440, height: 1000 } });

async function boardFixture(context: BrowserContext, filtered: boolean) {
  const state = await bugFixture(context);
  const base = state.tasks[0];
  state.tasks = (filtered
    ? [{ id: 'a', title: 'Visible first', position: 1000 }, { id: 'hidden', title: 'Hidden card', position: 2000 },
      { id: 'b', title: 'Visible anchor', position: 3000 }, { id: 'moving', title: 'Visible moving', position: 4000 }]
    : [{ id: 'a', title: 'First card', position: 1000 }, { id: 'b', title: 'Second card', position: 2000 }, { id: 'c', title: 'Third card', position: 3000 }]
  ).map(task => ({ ...base, ...task, status: 'TODO', parentTaskId: null, childTasks: [], metadata: {}, description: '', version: 1 }));
  const updates: any[] = [];
  await context.route('**/api/v1/tasks/*', async route => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const task = state.tasks.find(task => task.id === id);
    if (!task) return route.fallback();
    if (route.request().method() === 'PATCH') {
      const input = route.request().postDataJSON(); updates.push({ id, ...input });
      Object.assign(task, input, { version: task.version + 1 });
    }
    return route.fulfill({ json: task });
  });
  return { state, updates };
}

test('Move up under search preserves the hidden card position with reduced motion', async ({ page, context }) => {
  const { state, updates } = await boardFixture(context, true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/board');
  await page.getByRole('searchbox', { name: 'Search tasks', exact: true }).fill('Visible');
  await expect(page.getByRole('button', { name: 'Move directive Hidden card', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Actions for Visible moving', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Move up', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({ id: 'moving', position: 2500, version: 1 });
  expect(state.tasks.find(task => task.id === 'hidden')?.position).toBe(2000);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Move directive / })).toHaveText([
    /Visible first/, /Hidden card/, /Visible moving/, /Visible anchor/,
  ]);
});

test('dragging under search positions the task beside its full-column neighbor', async ({ page, context }) => {
  const { updates } = await boardFixture(context, true);
  await page.goto('/app/board');
  await page.getByRole('searchbox', { name: 'Search tasks', exact: true }).fill('Visible');
  const moving = page.getByRole('button', { name: 'Move directive Visible moving', exact: true });
  const anchor = page.getByRole('button', { name: 'Move directive Visible anchor', exact: true });
  await expect(page.getByRole('button', { name: 'Move directive Hidden card', exact: true })).toHaveCount(0);
  await moving.scrollIntoViewIfNeeded();
  const from = await moving.boundingBox(); const to = await anchor.boundingBox();
  expect(from).not.toBeNull(); expect(to).not.toBeNull();
  await page.mouse.move(from!.x + 30, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + 40, from!.y + from!.height / 2, { steps: 3 });
  await page.mouse.move(to!.x + 30, to!.y + to!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({ id: 'moving', position: 2500 });
});

test('dragging a card onto the next card moves it down one place', async ({ page, context }) => {
  const { updates } = await boardFixture(context, false);
  await page.goto('/app/board');
  const from = await page.getByRole('button', { name: 'Move directive First card', exact: true }).boundingBox();
  const to = await page.getByRole('button', { name: 'Move directive Second card', exact: true }).boundingBox();
  expect(from).not.toBeNull(); expect(to).not.toBeNull();
  await page.mouse.move(from!.x + 30, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + 40, from!.y + from!.height / 2, { steps: 3 });
  await page.mouse.move(to!.x + 30, to!.y + to!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({ id: 'a', position: 2500 });
});
