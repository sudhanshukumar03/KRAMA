import { test, expect } from './fixtures';

test('cancelled and accepted workspace switches preserve draft scope through the real API', async ({ page, account }) => {
  const original = (await account.call('GET', 'workspaces')).find((workspace: any) => workspace.id === account.workspaceId);
  const other = await account.call('POST', 'workspaces', { name: 'Second switch verification workspace' }, 201);
  const space = await account.call('POST', 'spaces', { name: 'Switch verification notes' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Original workspace note', spaceId: space.id }, 201);
  let fail = true;
  const scopes: string[] = [];
  await page.route(`**/api/v1/documents/${doc.id}/content`, route => {
    scopes.push(route.request().headers()['x-workspace-id']);
    return fail ? route.fulfill({ status: 503, json: { message: 'Controlled save outage' } }) : route.continue();
  });
  await account.signIn(page); await page.goto('/app/brain?doc=' + doc.id);
  await page.getByRole('textbox', { name: 'Document body', exact: true }).fill('Keep this draft in its original workspace.');
  await expect(page.getByRole('status').filter({ hasText: /^Save failed/ })).toBeVisible();
  let cancelled = false;
  page.once('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); cancelled = true; await dialog.dismiss(); });
  await page.getByTitle('Active Workspace: ' + original.name, { exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('option', { name: /Second switch verification workspace/ }).click();
  await expect.poll(() => cancelled).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('krama_active_workspace'))).toBe(account.workspaceId);
  fail = false;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect((await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('Keep this draft in its original workspace.');
  expect(scopes.every(scope => scope === account.workspaceId)).toBe(true);
  const newDashboard = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/dashboard' && response.request().headers()['x-workspace-id'] === other.id && response.status() === 200);
  await page.getByTitle('Active Workspace: ' + original.name, { exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('option', { name: /Second switch verification workspace/ }).click();
  await newDashboard;
  await expect(page).toHaveURL(/\/app\/$/);
  expect(await page.evaluate(() => localStorage.getItem('krama_active_workspace'))).toBe(other.id);
  expect((await account.call('GET', 'documents', undefined, 200, other.id)).items).toEqual([]);
});

test('a real Brain move advances the revision and the following body edit persists', async ({ page, account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Move revision verification' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Move this note', spaceId: space.id }, 201);
  const parent = await account.call('POST', 'documents', { title: 'Destination note', spaceId: space.id }, 201);
  await account.signIn(page); await page.goto('/app/brain?doc=' + doc.id);
  await page.getByRole('button', { name: 'More document actions', exact: true }).click();
  await page.getByRole('button', { name: 'Move Document...', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Move Document', exact: true });
  await modal.getByLabel('Target Parent').selectOption(parent.id);
  await modal.getByRole('button', { name: 'Move Document', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Document body', exact: true }).fill('Saved after moving through the real API.');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect.poll(async () => (await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('Saved after moving through the real API.');
  const saved = await account.call('GET', `documents/${doc.id}`);
  expect(saved.parentId).toBe(parent.id); expect(saved.updatedAt).not.toBe(doc.updatedAt);
});

test('real goal and project details remain editable when their related project list fails', async ({ page, account }) => {
  const goal = await account.call('POST', 'goals', { title: 'Usable goal during an outage', type: 'quarterly', metadata: { category: 'health', progressMode: 'manual' } }, 201);
  const project = await account.call('POST', 'projects', { name: 'Usable project during an outage', status: 'active', goalId: goal.id }, 201);
  await page.route('**/api/v1/projects', route => route.fulfill({ status: 503, json: { message: 'Controlled project-list outage' } }));
  await account.signIn(page); await page.goto('/app/goals');
  await expect(page.getByRole('alert')).toContainText('Some goal connections are unavailable');
  await page.getByRole('button', { name: 'Open Cockpit for ' + goal.title, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Goal details', exact: true });
  await drawer.getByRole('button', { name: 'Edit Settings', exact: true }).click();
  await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue(goal.title);
  await page.keyboard.press('Escape');
  await page.goto('/app/projects/' + project.id);
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Some linked details are unavailable');
  await page.getByRole('button', { name: 'Edit Project', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit Project Settings', exact: true })).toBeVisible();
});
