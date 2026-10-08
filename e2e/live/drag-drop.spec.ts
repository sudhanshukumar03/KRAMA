import { test, expect } from './fixtures';

test('Pointer movement and dependency edits survive reload', async ({ page, account }) => {
  const first = await account.call('POST', 'tasks', { title: 'Drag first', status: 'BACKLOG' }, 201);
  const second = await account.call('POST', 'tasks', { title: 'Drag second', status: 'BACKLOG' }, 201);
  await account.signIn(page); await page.setViewportSize({ width: 1900, height: 1000 }); await page.goto('/app/board');
  const card = page.getByRole('button', { name: 'Move directive Drag first', exact: true });
  const target = page.getByRole('region', { name: 'Review column', exact: true });
  await target.scrollIntoViewIfNeeded();
  const cb = await card.boundingBox(), tb = await target.boundingBox();
  expect(cb).toBeTruthy(); expect(tb).toBeTruthy();
  await page.mouse.move(cb!.x + 30, cb!.y + 75); await page.mouse.down();
  await page.mouse.move(cb!.x + 42, cb!.y + 75, { steps: 3 });
  await page.mouse.move(tb!.x + 60, tb!.y + 110, { steps: 15 }); await page.mouse.up();
  await expect.poll(async () => (await account.call('GET', `tasks/${first.id}`)).status).toBe('REVIEW');
  await page.getByText(second.title, { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Directive Details' });
  await dialog.getByLabel('Blocked By (Dependency)').selectOption(first.id);
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog).toBeHidden();
  expect((await account.call('GET', `tasks/${second.id}`)).blockedById).toBe(first.id);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Review column', exact: true }).getByText(first.title, { exact: true })).toBeVisible();
  await page.getByText(second.title, { exact: true }).first().click();
  await expect(dialog.getByLabel('Blocked By (Dependency)')).toHaveValue(first.id);
});
