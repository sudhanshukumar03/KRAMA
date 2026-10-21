import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { designFixture } from '../../scripts/media/example-workspace';

async function openAssistant(page: Page, context: BrowserContext) {
  await designFixture(context);
  await context.route('**/api/v1/ai/config', route => route.fulfill({ json: { available: true, provider: 'groq', ragEnabled: false } }));
  await page.goto('/app/habits');
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  return page.getByRole('textbox', { name: 'Ask KRAMA AI Assistant', exact: true });
}
const proposal = { type: 'direct', answer: 'Choose a next step.', sections: [], sources: [], actions: [
  { type: 'create_task', label: 'Draft the outline' }, { type: 'create_task', label: 'Review the draft' },
] };

test('an AI task proposal creates once despite rapid repeated activation', async ({ page, context }) => {
  const input = await openAssistant(page, context);
  await context.route('**/api/v1/ai/complete', route => route.fulfill({ json: proposal }));
  let writes = 0;
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await context.route(url => url.pathname === '/api/v1/tasks', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++;
    await pending;
    return route.fulfill({ status: 201, json: { id: `proposal-${writes}`, ...route.request().postDataJSON(), status: 'TODO', version: 1 } });
  });
  await input.fill('Suggest two tasks'); await input.press('Enter');
  const action = page.getByRole('button', { name: 'Draft the outline', exact: true });
  try {
    await action.dblclick();
    expect(writes, 'rapid repeated activation created duplicate task requests').toBe(1);
    await expect(action).toBeDisabled();
    await expect(action).toHaveAttribute('aria-busy', 'true');
    expect(writes).toBe(1);
    await page.getByRole('button', { name: 'Close AI Assistant', exact: true }).click();
    await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
    await expect(action).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Refresh Conversation', exact: true })).toBeDisabled();
  } finally { finish(); }
  await expect(page.getByRole('button', { name: 'Task created', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close AI Assistant', exact: true }).click();
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Task created', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Review the draft', exact: true })).toBeEnabled();
  expect(writes).toBe(1);
});

test('a failed AI proposal can retry without marking the task created', async ({ page, context }) => {
  const input = await openAssistant(page, context);
  await context.route('**/api/v1/ai/complete', route => route.fulfill({ json: proposal }));
  let writes = 0;
  await context.route(url => url.pathname === '/api/v1/tasks', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: ++writes === 1 ? 503 : 201, json: writes === 1 ? { message: 'Synthetic proposal outage' } : { id: 'retried-proposal', ...route.request().postDataJSON(), status: 'TODO', version: 1 } });
  });
  await input.fill('Suggest a task'); await input.press('Enter');
  const action = page.getByRole('button', { name: 'Draft the outline', exact: true });
  await action.click(); await expect(page.getByText('Synthetic proposal outage', { exact: true })).toBeVisible();
  await expect(action).toBeEnabled(); await action.click();
  await expect(page.getByRole('button', { name: 'Task created', exact: true })).toBeDisabled();
  expect(writes).toBe(2);
});

test('failed AI questions retain their text and retry without retyping', async ({ page, context }) => {
  const input = await openAssistant(page, context);
  let calls = 0;
  await context.route('**/api/v1/ai/complete', route => route.fulfill({ status: ++calls === 1 ? 503 : 200,
    json: calls === 1 ? { message: 'Synthetic assistant outage' } : { ...proposal, actions: [] } }));
  await input.fill('Keep this question for retry'); await input.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic assistant outage' })).toBeVisible();
  await expect(input).toHaveValue('Keep this question for retry');
  await input.press('Enter'); await expect(page.getByText('Choose a next step.', { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});

test('conversation reset cannot discard a question while its answer is pending', async ({ page, context }) => {
  const input = await openAssistant(page, context);
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await context.route('**/api/v1/ai/complete', async route => { await pending; return route.fulfill({ json: { ...proposal, actions: [] } }); });
  await input.fill('Preserve the pending question'); await input.press('Enter');
  try { await expect(page.getByRole('button', { name: 'Refresh Conversation', exact: true })).toBeDisabled(); }
  finally { finish(); }
  await expect(page.getByText('Choose a next step.', { exact: true })).toBeVisible();
});

test('a closed assistant completing its answer does not steal focus from workspace search', async ({ page, context }) => {
  const assistant = await openAssistant(page, context);
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await context.route('**/api/v1/ai/complete', async route => {
    await pending;
    return route.fulfill({ json: { ...proposal, answer: 'Background answer ready', actions: [] } });
  });
  await assistant.fill('Answer in the background'); await assistant.press('Enter');
  await page.getByRole('button', { name: 'Close AI Assistant', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Open AI Assistant', exact: true });
  await expect(opener).toBeFocused();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search your workspace', exact: true });
  await search.fill('Portfolio'); await expect(search).toBeFocused();
  const response = page.waitForResponse('**/api/v1/ai/complete');
  finish(); await (await response).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Portfolio');
  await page.keyboard.press('Escape');
  await opener.click();
  await expect(page.getByText('Background answer ready', { exact: true })).toBeVisible();
});
