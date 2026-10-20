import { test, expect } from './fixtures';

// Browser accessibility-tree contracts, not a claim that spoken output from
// Narrator, VoiceOver, TalkBack or NVDA has been tested.
test('Brain exposes a named multiline editor and save announcements', async ({ page, account }, testInfo) => {
  const space = await account.call('POST', 'spaces', { name: 'Accessible notes' }, 201);
  const document = await account.call('POST', 'documents', { title: 'Accessible document', spaceId: space.id }, 201);
  await account.signIn(page); await page.goto(`/app/brain?doc=${document.id}`);
  const skip = page.getByRole('link', { name: 'Skip to main content', exact: true });
  await skip.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('main')).toBeFocused();
  const body = page.getByRole('textbox', { name: 'Document body', exact: true });
  await expect(body).toHaveAttribute('aria-multiline', 'true');
  await body.focus(); await page.keyboard.type('An accessible document edit.');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect.poll(async () => (await account.call('GET', `documents/${document.id}`)).contentMarkdown).toContain('An accessible document edit.');
  await page.reload(); await expect(body).toContainText('An accessible document edit.');
  await testInfo.attach('brain-accessibility-tree', { body: await page.getByRole('main').ariaSnapshot(), contentType: 'text/plain' });
});

test('Focus exposes start/pause actions and announces state without announcing every tick', async ({ page, account }, testInfo) => {
  await account.signIn(page); await page.goto('/focus');
  for (const name of ['Centered Minimal', 'Zen Flow', 'Glass Card', 'Corner Overlay', 'Sidebar Plan', 'Default']) {
    await page.getByRole('button', { name: 'Settings and options', exact: true }).click();
    await page.getByRole('button', { name: 'Timer Layout', exact: true }).click();
    await page.getByRole('dialog', { name: 'Timer Layout' }).getByRole('button', { name: new RegExp('^' + name) }).click();
    const status = page.getByRole('status', { name: 'Timer status', exact: true });
    const time = page.getByRole('timer', { name: 'Time remaining', exact: true });
    await expect(time).toHaveAttribute('aria-live', 'off');
    await page.getByRole('button', { name: 'Start timer', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Timer running.');
    await expect(page.getByRole('button', { name: 'Pause timer', exact: true })).toBeFocused();
    await page.keyboard.press('Enter'); await expect(status).toHaveText('Timer paused.');
    await expect(page.getByRole('button', { name: 'Start timer', exact: true })).toBeFocused();
  }
  await testInfo.attach('focus-accessibility-tree', { body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain' });
});
