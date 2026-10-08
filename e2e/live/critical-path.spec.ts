import { test, expect } from './fixtures';

test('Project-linked task survives refresh', async ({ page, account }) => {
  await account.signIn(page);
  await page.goto('/app/projects');
  await page.getByRole('button', { name: 'New Initiative', exact: true }).click();
  await page.getByPlaceholder('e.g., Autonomous Decision Engine v2').fill('Persistence project');
  await page.getByRole('button', { name: 'Launch Initiative', exact: true }).click();
  await expect(page.getByText('Persistence project', { exact: true }).first()).toBeVisible();
  const project = (await account.call('GET', 'projects')).find((item: any) => item.name === 'Persistence project');
  await page.goto('/app/board');
  await page.getByRole('button', { name: 'New Directive', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Directive' });
  await dialog.getByLabel('Directive Title *', { exact: true }).fill('Persistence task');
  await dialog.getByLabel('Project Scope', { exact: true }).selectOption(project.id);
  await dialog.getByRole('button', { name: 'Create Directive', exact: true }).click();
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
  const dialog = page.getByRole('dialog', { name: 'Directive Details' });
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
    const first = page.getByRole('dialog', { name: 'Directive Details' });
    const second = other.getByRole('dialog', { name: 'Directive Details' });
    await first.getByLabel('Directive Title *', { exact: true }).fill('Saved task');
    await second.getByLabel('Directive Title *', { exact: true }).fill('Retained draft');
    await first.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(first).toBeHidden();
    await expect(second.getByText(/This task changed elsewhere/)).toBeVisible();
    const response = other.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith(`/tasks/${task.id}`));
    await second.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await response).status()).toBe(409);
    await expect(second.getByRole('alert')).toContainText('draft is retained');
    await expect(second.getByLabel('Directive Title *', { exact: true })).toHaveValue('Retained draft');
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
  await expect(page.getByText(owned.title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(foreign.title, { exact: true })).toHaveCount(0);
});
