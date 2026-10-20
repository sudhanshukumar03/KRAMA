import { test, expect } from './fixtures';

test('AI failure keeps the instruction and document draft available for retry', async ({ page, account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Provider failure verification' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Retained provider failure note', spaceId: space.id,
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original personal note.' }] }] } }, 201);
  await account.signIn(page); await page.goto(`/app/brain?doc=${doc.id}`);
  await page.getByRole('button', { name: 'AI Assist', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI Assist' });
  await panel.getByRole('button', { name: 'Compose & Refine' }).click();
  const instruction = panel.getByLabel('Writing instruction'); await instruction.fill('Keep this writing instruction after an outage.');
  // Deterministic transport failure with a real signed-in editor and save API.
  if (process.env.KRAMA_PROVIDER_FAILURE_VERIFY !== '1') {
    await page.route(`**/documents/${doc.id}/ai/compose`, route => route.fulfill({ status: 503, json: { message: 'Provider temporarily unavailable' } }));
  }
  const response = page.waitForResponse(reply => reply.url().endsWith(`/documents/${doc.id}/ai/compose`), { timeout: 45000 });
  let refreshes = 0;
  page.on('request', request => { if (request.url().endsWith('/auth/refresh')) refreshes++; });
  await panel.getByRole('button', { name: 'Generate with AI' }).click();
  expect((await response).status()).toBe(503);
  await expect(page.getByText(/AI Compose failed/).first()).toBeVisible({ timeout: 45000 });
  await expect(instruction).toHaveValue('Keep this writing instruction after an outage.');
  await expect(panel.getByRole('button', { name: 'Generate with AI' })).toBeEnabled();
  expect(refreshes).toBe(0); await expect(page).toHaveURL(/\/app\/brain/);
  expect((await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('Original personal note.');
});
