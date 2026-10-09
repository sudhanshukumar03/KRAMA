import { test, expect } from './fixtures';

test.skip(process.env.KRAMA_AI_VERIFY !== '1', 'Real provider checks require KRAMA_AI_VERIFY=1');

test('Grounded AI answers from a document and saves composed text', async ({ page, account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Synthetic AI verification' }, 201);
  const document = await account.call('POST', 'documents', {
    title: 'Synthetic launch specification', spaceId: space.id,
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The synthetic verification launch code is SAPPHIRE42.' }] }] },
  }, 201);
  await account.signIn(page);
  await page.goto(`/app/brain?doc=${document.id}`);
  await expect(page.getByLabel('Document title')).toHaveValue(document.title);
  await page.getByRole('button', { name: 'AI Assist', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI Assist', exact: true });
  await expect(panel).toBeVisible();
  const askResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/documents/${document.id}/ai/ask`));
  await panel.getByLabel('Question about this document').fill('What is the synthetic verification launch code? Reply with just the code.');
  await panel.getByLabel('Question about this document').press('Enter');
  const asked = await askResponse; expect(asked.status()).toBe(200); await asked.finished();
  expect(await asked.text()).toContain('data: [DONE]');
  await expect(panel.locator('.whitespace-pre-wrap')).toContainText('SAPPHIRE42', { timeout: 30000 });

  await panel.getByRole('button', { name: 'Compose & Refine', exact: true }).click();
  await panel.getByLabel('Writing instruction').fill('Write exactly this short sentence: Synthetic verification complete.');
  const composeResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/documents/${document.id}/ai/compose`));
  await panel.getByRole('button', { name: 'Generate with AI', exact: true }).click();
  const composed = await composeResponse; expect(composed.status()).toBe(200); await composed.finished();
  expect(await composed.text()).toContain('data: [DONE]');
  await expect(panel.locator('.whitespace-pre-wrap')).toContainText('Synthetic verification complete', { timeout: 30000 });
  await panel.getByRole('button', { name: 'Insert at Cursor', exact: true }).click();
  await expect.poll(async () => (await account.call('GET', `documents/${document.id}`)).contentMarkdown).toContain('Synthetic verification complete');
  await page.reload();
  await expect(page.locator('.tiptap')).toContainText('Synthetic verification complete');
});
