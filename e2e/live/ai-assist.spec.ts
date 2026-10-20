import { test, expect } from './fixtures';

test.skip(process.env.KRAMA_AI_VERIFY !== '1', 'Real provider checks require KRAMA_AI_VERIFY=1');

// The stream layer allows two 30s attempts plus a 500ms retry delay before
// returning an early provider failure. Observe that response, rather than
// aborting at the ordinary 15s browser-action deadline. Success still requires
// HTTP 200, a completed stream, grounded content and persisted composition.
const providerResponseTimeout = 65000;

test('Grounded AI answers from a document and saves composed text', async ({ page, account }) => {
  if (process.env.KRAMA_VERIFY_MODE === 'ai') {
    const config = await account.call('GET', 'ai/config');
    if (!process.env.GROQ_API_KEY) {
      expect(config.provider).toBe('gemini');
      expect(config.model).toBe(process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-3.8-flash');
      expect(config.fallbackAvailable).toBe(false);
    }
  }
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
  const askResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/documents/${document.id}/ai/ask`), { timeout: providerResponseTimeout });
  await panel.getByLabel('Question about this document').fill('What is the synthetic verification launch code? Reply with just the code.');
  await panel.getByLabel('Question about this document').press('Enter');
  const asked = await askResponse; expect(asked.status()).toBe(200); await asked.finished();
  expect(await asked.text()).toContain('data: [DONE]');
  await expect(panel.locator('.whitespace-pre-wrap')).toContainText('SAPPHIRE42', { timeout: 30000 });

  await panel.getByRole('button', { name: 'Compose & Refine', exact: true }).click();
  await panel.getByLabel('Writing instruction').fill('Write exactly this short sentence: Synthetic verification complete.');
  const composeResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/documents/${document.id}/ai/compose`), { timeout: providerResponseTimeout });
  await panel.getByRole('button', { name: 'Generate with AI', exact: true }).click();
  const composed = await composeResponse; expect(composed.status()).toBe(200); await composed.finished();
  expect(await composed.text()).toContain('data: [DONE]');
  await expect(panel.locator('.whitespace-pre-wrap')).toContainText('Synthetic verification complete', { timeout: 30000 });
  await panel.getByRole('button', { name: 'Insert at Cursor', exact: true }).click();
  await expect.poll(async () => (await account.call('GET', `documents/${document.id}`)).contentMarkdown).toContain('Synthetic verification complete');
  await page.reload();
  await expect(page.locator('.tiptap')).toContainText('Synthetic verification complete');
});
