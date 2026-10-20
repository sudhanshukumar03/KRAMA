import { test, expect } from './fixtures';
import type { Page, Locator } from '@playwright/test';

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const visited: string[] = [];
  // Firefox can move keyboard focus into browser chrome at the end of a page,
  // while document.activeElement stays on its final button. Earlier controls
  // must also be reachable by reversing direction, without assuming Tab wraps.
  for (const key of ['Tab', 'Shift+Tab']) for (let index = 0; index < 80; index++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    if (index > 73) visited.push(await page.evaluate(() => {
      const active = document.activeElement;
      return `${active?.tagName}:${active?.getAttribute('aria-label') || active?.textContent?.trim().slice(0, 45)}`;
    }));
    await page.keyboard.press(key);
  }
  throw new Error('Control was not reachable using Tab: ' + await target.getAttribute('aria-label') + ' ' + await target.textContent() + '; final focus path: ' + visited.join(' -> '));
}
async function enter(page: Page, target: Locator) { await tabTo(page, target); await page.keyboard.press('Enter'); }
async function fit(page: Page, panel?: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflows the viewport').toBe(true);
  if (panel) {
    const box = await panel.boundingBox(); expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(-1); expect(box!.y).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    const overflow = await panel.evaluate(element => {
      if (element.scrollWidth <= element.clientWidth + 1) return null;
      const edge = element.getBoundingClientRect().right;
      return [...element.querySelectorAll('*')].filter(child => child.getBoundingClientRect().right > edge + 1).slice(0, 6).map(child => ({ tag: child.tagName, width: child.getBoundingClientRect().width, className: child.getAttribute('class') }));
    });
    expect(overflow, 'dialog content overflows horizontally: ' + JSON.stringify(overflow)).toBeNull();
  }
}
async function trap(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  for (const key of [...Array(35).fill('Tab'), ...Array(12).fill('Shift+Tab')]) {
    await page.keyboard.press(key);
    expect(await dialog.evaluate(element => element.contains(document.activeElement)), key + ' left the dialog').toBe(true);
  }
}
async function seed(account: any) {
  const day = (await account.call('GET', 'dashboard')).dateKey;
  const goal = await account.call('POST', 'goals', { title: 'Keyboard personal goal', type: 'monthly' }, 201);
  const space = await account.call('POST', 'spaces', { name: 'Keyboard notes' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Keyboard personal note', spaceId: space.id }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Keyboard personal task', status: 'TODO', scheduledDate: day + 'T12:00:00Z', estimateMinutes: 25 }, 201);
  return { day, goal, doc, task };
}

for (const width of [320, 390]) for (const theme of ['light', 'dark']) {
  test(`Planner, Brain, Goals and Focus fit ${width}px in ${theme} mode`, async ({ page, account }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), theme);
    const data = await seed(account); await account.signIn(page);
    for (const [section, route, ready] of [
      ['planner', `/app/planner?mode=day&date=${data.day}`, 'Planner'],
      ['brain', `/app/brain?doc=${data.doc.id}`, 'Knowledge Brain'],
      ['goals', '/app/goals', 'Goals'],
    ]) {
      await page.goto(route);
      if (section === 'brain') await expect(page.getByLabel('Document title')).toBeVisible();
      else await expect(page.getByRole('heading', { name: ready, exact: true })).toBeVisible();
      await fit(page);
      await page.screenshot({ path: testInfo.outputPath(`${section}-${width}-${theme}.png`) });
    }
    await page.goto(`/app/goals?goal=${data.goal.id}`);
    const goal = page.getByRole('dialog', { name: 'Goal details' });
    await expect(goal).toBeVisible(); await fit(page, goal); await trap(page, goal);
    await page.keyboard.press('Escape'); await expect(goal).not.toBeVisible();
    await page.goto(`/focus?task=${data.task.id}&date=${data.day}`);
    const focus = page.getByRole('dialog', { name: 'Plan your focus time' });
    await expect(focus).toBeVisible({ timeout: 15000 }); await fit(page, focus); await trap(page, focus);
    await page.keyboard.press('Escape'); await expect(focus).not.toBeVisible(); await fit(page);
    await page.screenshot({ path: testInfo.outputPath(`focus-${width}-${theme}.png`) });
  });
}

test('keyboard alone opens navigation and reaches all workspace sections', async ({ page, account }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await account.signIn(page);
  for (const label of ['Planner', 'Brain Workspace', 'Goals']) {
    const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
    await enter(page, trigger);
    const navigation = page.getByRole('dialog', { name: 'Workspace navigation' });
    await trap(page, navigation);
    await enter(page, navigation.getByRole('link', { name: new RegExp('^' + label) }));
    await expect(navigation).not.toBeVisible();
    await fit(page);
  }
});

test('Planner dialogs are keyboard reachable, contained, and restore focus', async ({ page, account }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const { day } = await seed(account); await account.signIn(page);
  await page.goto(`/app/planner?mode=day&date=${day}`);
  const triggers = [page.getByRole('button', { name: 'Time Block', exact: true }), page.getByRole('button', { name: 'Change holiday location', exact: true })];
  for (const trigger of triggers) {
    await enter(page, trigger); const dialog = page.getByRole('dialog');
    await fit(page, dialog); await trap(page, dialog);
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await enter(page, page.getByRole('button', { name: 'WEEK', exact: true }));
  await enter(page, page.getByRole('button', { name: 'Edit', exact: true }));
  const capacity = page.getByRole('dialog'); await fit(page, capacity); await trap(page, capacity);
  await page.keyboard.press('Escape'); await expect(capacity).not.toBeVisible();
});

test('Brain search and AI dialogs work from the keyboard on mobile', async ({ page, account }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const { doc } = await seed(account); await account.signIn(page);
  await page.goto(`/app/brain?doc=${doc.id}`);
  for (const name of ['Search documents', 'AI Assist']) {
    const trigger = page.getByRole('button', { name, exact: true });
    await enter(page, trigger); const dialog = page.getByRole('dialog');
    await fit(page, dialog); await trap(page, dialog);
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  }
});

test('goal creation and shortcut help can be operated without a mouse', async ({ page, account }) => {
  await page.setViewportSize({ width: 320, height: 640 }); await account.signIn(page); await page.goto('/app/goals');
  const trigger = page.getByRole('button', { name: /New Goal|Create Goal/i }).first();
  await enter(page, trigger); const dialog = page.getByRole('dialog');
  await fit(page, dialog); await trap(page, dialog);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await fit(page, help); await trap(page, help); await page.keyboard.press('Escape'); await expect(help).not.toBeVisible();
});

test('Focus customization dialogs fit mobile, trap keys, and return to options', async ({ page, account }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await account.signIn(page); await page.goto('/focus');
  const trigger = page.getByRole('button', { name: 'Settings and options', exact: true });
  for (const [item, title] of [['Timer Layout', 'Timer Layout'], ['Wallpaper & Layout', 'Wallpaper and Layout'], ['Customize', 'Timer Configuration']]) {
    await enter(page, trigger); await enter(page, page.getByRole('button', { name: new RegExp('^' + item) }));
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await fit(page, dialog); await trap(page, dialog);
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  }
});

for (const selectedTask of [false, true]) {
test(`every Focus layout keeps the timer and options usable on mobile${selectedTask ? ' with a selected task' : ''}`, async ({ page, account }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const data = selectedTask ? await seed(account) : null;
  await account.signIn(page);
  await page.goto(data ? `/focus?task=${data.task.id}&date=${data.day}` : '/focus');
  if (data) await page.getByRole('dialog', { name: 'Plan your focus time' }).getByRole('button', { name: 'Use this plan' }).click();
  for (const name of ['Centered Minimal', 'Zen Flow', 'Glass Card', 'Corner Overlay', 'Sidebar Plan', 'Default']) {
    const trigger = page.getByRole('button', { name: 'Settings and options', exact: true });
    await enter(page, trigger); await enter(page, page.getByRole('button', { name: 'Timer Layout', exact: true }));
    const option = page.getByRole('dialog', { name: 'Timer Layout' }).getByRole('button', { name: new RegExp('^' + name) });
    await option.click({ trial: true, timeout: 3000 });
    await enter(page, option);
    const controls = [trigger, page.getByTitle('Click or press Enter to start', { exact: true })];
    if (data) controls.push(page.getByRole('button', { name: '15m', exact: true }), page.getByRole('button', { name: '90m', exact: true }));
    for (const control of controls) {
      const box = await control.boundingBox(); expect(box, name).toBeTruthy();
      expect(box!.x, name).toBeGreaterThanOrEqual(-1); expect(box!.y, name).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(321); expect(box!.y + box!.height, name).toBeLessThanOrEqual(641);
      // Geometry alone misses another fixed panel intercepting touch/clicks.
      await control.click({ trial: true, timeout: 3000 });
    }
    await page.screenshot({ path: testInfo.outputPath(name + '-320.png') });
  }
});
}

test('goal horizon defaults use the local calendar just after midnight', async ({ page, account }) => {
  await account.signIn(page);
  await page.clock.setFixedTime(new Date('2026-10-16T00:05:00+05:30'));
  await page.goto('/app/goals');
  await enter(page, page.getByRole('button', { name: 'New Goal', exact: true }));
  const dialog = page.getByRole('dialog', { name: 'New Goal' });
  await expect(dialog.getByLabel('Target date', { exact: true })).toHaveValue('2027-01-14');
  await dialog.getByLabel('Goal horizon').selectOption('monthly');
  await expect(dialog.getByLabel('Target date', { exact: true })).toHaveValue('2026-11-15');
  await dialog.getByLabel('Goal horizon').selectOption('yearly');
  await expect(dialog.getByLabel('Target date', { exact: true })).toHaveValue('2027-10-16');
});
