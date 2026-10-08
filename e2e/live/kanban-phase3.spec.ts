import { test, expect } from './fixtures';

test('UI-created tasks retain dependencies and status after reload', async ({ page, account }) => {
  await account.signIn(page); await page.goto('/app/board');
  for (const title of ['Dependency source', 'Dependency target']) {
    await page.getByRole('button', { name: 'New Directive', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create New Directive' });
    await dialog.getByLabel('Directive Title *', { exact: true }).fill(title);
    await dialog.getByRole('button', { name: 'Create Directive', exact: true }).click();
    await expect(dialog).toBeHidden(); await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
  const tasks = await account.call('GET', 'tasks');
  const source = tasks.find((task: any) => task.title === 'Dependency source');
  const target = tasks.find((task: any) => task.title === 'Dependency target');
  await page.getByText(target.title, { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Directive Details' });
  await dialog.getByLabel('Blocked By (Dependency)').selectOption(source.id);
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog).toBeHidden();
  await page.getByText(source.title, { exact: true }).first().click();
  await dialog.getByLabel('Column / Status').selectOption('IN_PROGRESS');
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog).toBeHidden();
  expect((await account.call('GET', `tasks/${target.id}`)).blockedById).toBe(source.id);
  expect((await account.call('GET', `tasks/${source.id}`)).status).toBe('IN_PROGRESS');
  await page.reload();
  await expect(page.getByRole('region', { name: 'In Progress column', exact: true }).getByText(source.title, { exact: true })).toBeVisible();
  await page.getByText(target.title, { exact: true }).first().click();
  await expect(dialog.getByLabel('Blocked By (Dependency)')).toHaveValue(source.id);
});
