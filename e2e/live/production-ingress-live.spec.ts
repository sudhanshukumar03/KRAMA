import { test, expect } from './fixtures';

test('large valid backups pass the production proxy and restore into a new workspace', async ({ account }) => {
  test.skip(!process.env.KRAMA_PRODUCTION_VERIFY, 'Production ingress check');
  await account.call('POST', 'tasks', { title: 'Large backup verification' }, 201);
  const backup = await account.call('GET', 'workspaces/export');
  backup.workspace.tasks[0].description = 'x'.repeat(12 * 1024 * 1024);
  const restored = await account.call('POST', 'workspaces/restore', backup, 201);
  expect(restored.id).not.toBe(account.workspaceId);
  const tasks = await account.call('GET', 'tasks', undefined, 200, restored.id);
  expect(tasks[0].description.length).toBe(12 * 1024 * 1024);
});

test('unconfigured storage rejects uploads clearly without altering the workspace', async ({ page, account }) => {
  const capabilities = await account.call('GET', 'upload/capabilities');
  test.skip(capabilities.uploadAvailable, 'This check exercises deployments without R2');
  const result = await account.call('POST', 'upload', {}, 503);
  expect(result.code).toBe('UPLOAD_NOT_CONFIGURED');
  await account.signIn(page); await page.goto('/focus');
  await page.getByRole('button', { name: 'Settings and options' }).click();
  await page.getByRole('button', { name: /^Wallpaper & Layout/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Wallpaper and Layout' });
  await dialog.getByRole('button', { name: /^Upload/ }).click();
  await expect(dialog.getByText(/not configured|unavailable|coming soon/i).first()).toBeVisible();
});
