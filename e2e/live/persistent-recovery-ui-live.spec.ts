import { test, expect } from './fixtures';

for (const theme of ['light', 'dark']) test(`deleted-space note restores, opens and saves in ${theme} mode`, async ({ page, account }) => {
  await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), theme);
  const space = await account.call('POST', 'spaces', { name: 'Browser recovery source' }, 201);
  const doc = await account.call('POST', 'documents', { spaceId: space.id, title: 'Recovered from removed space', contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original recovered writing.' }] }] } }, 201);
  await account.call('DELETE', `spaces/${space.id}`);
  await account.signIn(page);
  await page.goto('/app/brain');
  await page.getByRole('tab', { name: 'Soft-Deleted Documents (Trash)', exact: true }).click();
  await expect(page.getByText(doc.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore Document', exact: true }).click();
  await expect(page.getByLabel('Document title', { exact: true })).toHaveValue(doc.title);
  await expect(page.locator('.tiptap')).toContainText('Original recovered writing.');
  await page.reload();
  await expect(page.getByLabel('Document title', { exact: true })).toHaveValue(doc.title);
  await page.locator('.tiptap').fill('Recovered writing can still be edited.');
  await expect.poll(async () => (await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('Recovered writing can still be edited.');
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*\bdark\b).*$/);
});
