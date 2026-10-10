import { test, expect } from './fixtures';

test('Dashboard quick capture supports all modes and keyboard dismissal', async ({ page, account }) => {
  await account.signIn(page);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByText('Quick Capture', { exact: true }).first()).toBeVisible();
  for (const mode of ['Task', 'Idea', 'Link', 'Note']) {
    const trigger = page.getByRole('button', { name: mode, exact: true }).first();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Quick capture', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: mode, exact: true })).toBeVisible();
    await expect(dialog.getByLabel('Title', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});
