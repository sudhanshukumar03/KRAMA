import { test, expect } from './fixtures';
import type { Page, Locator } from '@playwright/test';

async function activate(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (const key of ['Tab', 'Shift+Tab']) for (let index = 0; index < 90; index++) {
    if (await target.evaluate(element => element === document.activeElement)) { await page.keyboard.press('Enter'); return; }
    await page.keyboard.press(key);
  }
  throw new Error('Control is not keyboard reachable');
}

test('real worker notifications open tasks and persist single/all read changes using the keyboard', async ({ page, account }) => {
  const tasks: { id: string; version: number }[] = [];
  for (const title of ['First notification task', 'Second notification task']) {
    const task = await account.call('POST', 'tasks', { title, status: 'TODO' }, 201);
    await account.call('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version }); tasks.push(task);
  }
  await expect.poll(async () => (await account.call('GET', 'notifications')).length, { timeout: 15000 }).toBe(2);
  const notifications = await account.call('GET', 'notifications');
  expect(notifications.every((item: any) => item.actionUrl?.startsWith('/app/board?task='))).toBe(true);
  // Older completion notifications only contain taskId metadata.
  const { prisma } = await import('../../apps/server/src/prisma');
  await prisma.notification.update({ where: { id: notifications.find((item: any) => item.metadata.taskId === tasks[0].id).id }, data: { actionUrl: null } });
  await page.setViewportSize({ width: 320, height: 640 }); await account.signIn(page);
  const trigger = page.getByRole('button', { name: 'Notifications', exact: true });
  await activate(page, trigger);
  const region = page.getByRole('region', { name: 'Notifications', exact: true });
  await expect(region).toBeVisible();
  const box = (await region.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
  const notification = region.getByRole('button', { name: /Open notification:.*First notification task/ });
  await activate(page, notification);
  await expect(page).toHaveURL(new RegExp('/app/board\\?task=' + tasks[0].id));
  await expect(page.getByRole('dialog', { name: 'Task Details' })).toBeVisible();
  await expect.poll(async () => (await account.call('GET', 'notifications')).filter((item: any) => item.read).length).toBe(1);
  await page.keyboard.press('Escape'); await activate(page, trigger);
  await activate(page, region.getByRole('button', { name: 'Mark all read', exact: true }));
  await expect.poll(async () => (await account.call('GET', 'notifications')).every((item: any) => item.read)).toBe(true);
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.reload(); await activate(page, trigger);
  await expect(region.getByRole('button', { name: 'Mark all read', exact: true })).toHaveCount(0);
  await expect(region.getByRole('button', { name: /^Open notification:/ })).toHaveCount(2);
});

test('Brain title/body editing and subtree trash/Undo persist through the actual browser', async ({ page, account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Browser editing verification' }, 201);
  const root = await account.call('POST', 'documents', { title: 'Original browser note', spaceId: space.id }, 201);
  const child = await account.call('POST', 'documents', { title: 'Nested browser note', spaceId: space.id, parentId: root.id }, 201);
  await account.call('POST', 'documents', { title: 'Other browser note', spaceId: space.id }, 201);
  await account.signIn(page); await page.goto('/app/brain?doc=' + child.id);
  await expect(page.getByLabel('Document title')).toHaveValue('Nested browser note');
  await page.locator('.tiptap').fill('Child content before parent trash.');
  await expect.poll(async () => (await account.call('GET', `documents/${child.id}`)).contentMarkdown).toContain('Child content before parent trash.');
  await page.getByRole('button', { name: /^Original browser note/ }).first().click();
  await expect(page.getByLabel('Document title')).toHaveValue('Original browser note');
  await page.getByLabel('Document title').fill('Renamed browser note');
  await page.locator('.tiptap').fill('A real edited body retained through trash and Undo.');
  const actions = page.getByRole('button', { name: 'More document actions', exact: true });
  await actions.click();
  page.once('dialog', prompt => prompt.accept());
  await page.getByRole('button', { name: 'Move to Trash', exact: true }).click();
  const { prisma } = await import('../../apps/server/src/prisma');
  await expect.poll(async () => !!(await prisma.document.findUnique({ where: { id: root.id } }))?.deletedAt).toBe(true);
  const trashed = await prisma.document.findUniqueOrThrow({ where: { id: root.id } });
  expect(trashed.title).toBe('Renamed browser note');
  expect(trashed.contentMarkdown).toContain('A real edited body retained through trash and Undo.');
  await account.call('GET', `documents/${root.id}`, undefined, 404);
  await account.call('GET', `documents/${child.id}`, undefined, 404);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Document title')).toHaveValue('Renamed browser note');
  await expect(page.locator('.tiptap')).toContainText('A real edited body retained through trash and Undo.');
  expect((await account.call('GET', `documents/${child.id}`)).parentId).toBe(root.id);
  const childButton = page.getByRole('button', { name: /^Nested browser note/ }).first();
  if (!await childButton.isVisible()) await page.getByRole('button', { name: 'Expand Renamed browser note', exact: true }).click();
  await childButton.click(); await expect(page.getByLabel('Document title')).toHaveValue('Nested browser note');
  await page.locator('.tiptap').fill('Child content after restore.');
  await expect.poll(async () => (await account.call('GET', `documents/${child.id}`)).contentMarkdown).toContain('Child content after restore.');
  await page.getByRole('button', { name: /^Renamed browser note/ }).first().click();
  await expect(page.getByLabel('Document title')).toHaveValue('Renamed browser note');
  await page.reload(); await expect(page.getByLabel('Document title')).toHaveValue('Renamed browser note');
  await expect(page.locator('.tiptap')).toContainText('A real edited body retained through trash and Undo.');
});
