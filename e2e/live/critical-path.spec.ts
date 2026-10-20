import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('AI settings reads stay available without consuming the generation allowance', async ({ account }) => {
  for (let index = 0; index < 25; index++) {
    await account.call('GET', 'ai/config');
    await account.call('GET', 'ai/usage');
  }
  // Missing input exercises the limiter without sending data to a provider.
  for (let index = 0; index < 20; index++) {
    await account.call('POST', 'ai/complete', {}, 400);
  }
  await account.call('POST', 'ai/complete', {}, 429);
  await account.call('GET', 'ai/config');
  await account.call('GET', 'ai/usage');
});

test('Focus settings keep keyboard focus inside the dialog and persist bounded durations', async ({ page, account }) => {
  await account.signIn(page);
  await page.goto('/focus');
  await page.getByRole('button', { name: 'Settings and options', exact: true }).click();
  await page.getByRole('button', { name: /^Customize/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Timer Configuration', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Save & Close', exact: true })).toBeFocused();
  const duration = dialog.getByRole('spinbutton', { name: 'Focus Duration', exact: true });
  await duration.fill('999');
  await expect(duration).toHaveValue('120');
  await expect.poll(async () => (await account.call('GET', 'auth/me')).user.metadata?.timerPreferences?.focusDuration).toBe(120);
  await duration.press('Escape');
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page).toHaveTitle(/\(120:00\) Focus/);
});

test('Workspace export downloads a readable backup of the signed-in workspace', async ({ page, account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Workspace export verification' }, 201);
  await account.signIn(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const ready = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export Data/ }).click();
  const download = await ready;
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  expect(file).toBeTruthy();
  const backup = JSON.parse(await readFile(file!, 'utf8'));
  expect(backup.format).toBe('krama-workspace-backup');
  expect(backup.workspace.id).toBe(account.workspaceId);
  expect(backup.workspace.tasks.some((entry: { id: string }) => entry.id === task.id)).toBe(true);
  expect(backup.workspace.members[0].user).not.toHaveProperty('passwordHash');
});

test('Project-linked task survives refresh', async ({ page, account }) => {
  await account.signIn(page);
  await page.goto('/app/projects');
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await page.getByPlaceholder('e.g. Launch the Krama workspace').fill('Persistence project');
  await page.getByRole('button', { name: 'Create Project', exact: true }).click();
  await expect(page.getByText('Persistence project', { exact: true }).first()).toBeVisible();
  const project = (await account.call('GET', 'projects')).find((item: any) => item.name === 'Persistence project');
  await page.goto('/app/board');
  await page.getByRole('button', { name: 'New Task', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Task' });
  await dialog.getByLabel('Task Title *', { exact: true }).fill('Persistence task');
  await dialog.getByLabel('Project Scope', { exact: true }).selectOption(project.id);
  await dialog.getByRole('button', { name: 'Create Task', exact: true }).click();
  await expect(dialog).toBeHidden();
  const task = (await account.call('GET', 'tasks')).find((item: any) => item.title === 'Persistence task');
  expect(task.projectId).toBe(project.id);
  await page.reload();
  await expect(page.getByText('Persistence task', { exact: true }).first()).toBeVisible();
});

test('Task completion persists in Done', async ({ page, account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Completion task' }, 201);
  await account.signIn(page); await page.goto('/app/board');
  await page.getByText(task.title, { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Task Details' });
  await dialog.getByLabel('Column / Status').selectOption('DONE');
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await account.call('GET', `tasks/${task.id}`)).status).toBe('DONE');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Done column', exact: true }).getByText(task.title, { exact: true })).toBeVisible();
});

test('Logout and sign-in retain owned data', async ({ page, account }) => {
  await account.call('POST', 'projects', { name: 'Retained project' }, 201);
  await account.signIn(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const response = await page.request.get(new URL('/api/v1/workspaces', process.env.KRAMA_API_TARGET).href);
  expect(response.status()).toBe(401);
  await account.signIn(page); await page.goto('/app/projects');
  await expect(page.getByText('Retained project', { exact: true }).first()).toBeVisible();
});

test('Two-tab edits reject stale saves and retain the draft', async ({ page, context, account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Concurrent task' }, 201);
  await account.signIn(page);
  const other = await context.newPage();
  try {
    for (const tab of [page, other]) {
      const connected = tab.waitForEvent('console', { predicate: message => message.text() === 'Real-time connection established' });
      await tab.goto('/app/board'); await connected;
      await tab.getByText(task.title, { exact: true }).first().click();
    }
    const first = page.getByRole('dialog', { name: 'Task Details' });
    const second = other.getByRole('dialog', { name: 'Task Details' });
    await first.getByLabel('Task Title *', { exact: true }).fill('Saved task');
    await second.getByLabel('Task Title *', { exact: true }).fill('Retained draft');
    await first.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(first).toBeHidden();
    await expect(second.getByText(/This task changed elsewhere/)).toBeVisible();
    const response = other.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith(`/tasks/${task.id}`));
    await second.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await response).status()).toBe(409);
    await expect(second.getByRole('alert')).toContainText('draft is retained');
    await expect(second.getByLabel('Task Title *', { exact: true })).toHaveValue('Retained draft');
    expect((await account.call('GET', `tasks/${task.id}`)).title).toBe('Saved task');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(other).toHaveURL(/\/login/);
    await other.reload();
    await expect(other.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  } finally { await other.close(); }
});

test('Workspace isolation rejects foreign task access', async ({ page, account }) => {
  const owned = await account.call('POST', 'tasks', { title: 'Owned workspace task' }, 201);
  const workspace = await account.call('POST', 'workspaces', { name: 'Secondary test workspace' }, 201);
  const foreign = await account.call('POST', 'tasks', { title: 'Foreign workspace task' }, 201, workspace.id);
  await account.call('GET', `tasks/${foreign.id}`, undefined, 404);
  expect((await account.call('GET', `tasks/${foreign.id}`, undefined, 200, workspace.id)).id).toBe(foreign.id);
  await account.signIn(page);
  await page.evaluate(id => localStorage.setItem('krama_active_workspace', id), account.workspaceId);
  await page.goto('/app/board');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(owned.title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(foreign.title, { exact: true })).toHaveCount(0);
});
