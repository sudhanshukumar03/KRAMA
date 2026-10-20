import { test, expect } from './fixtures';
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const draft = () => ({ title: 'Project reservation', type: 'WORK', date: `${day()}T12:00:00Z`, startTime: '09:00', endTime: '09:25' });

test('partial block edits follow the task after a project change', async ({ account }) => {
  const first = await account.call('POST', 'projects', { name: 'Original project' }, 201);
  const second = await account.call('POST', 'projects', { name: 'Current project' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Moved task', projectId: first.id }, 201);
  const block = await account.call('POST', 'planner/time-blocks', { ...draft(), taskId: task.id, projectId: first.id }, 201);
  const latest = await account.call('GET', `tasks/${task.id}`);
  await account.call('PATCH', `tasks/${task.id}`, { projectId: second.id, version: latest.version });
  const edited = await account.call('PATCH', `planner/time-blocks/${block.id}`, { title: 'Still editable' });
  expect(edited.projectId).toBe(second.id);
  const date = new Date(`${day()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1);
  const moved = await account.call('PATCH', `planner/time-blocks/${block.id}`, { date: date.toISOString() });
  expect(moved.projectId).toBe(second.id);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { projectId: first.id }, 400);
});

test('task-only reservations derive the task project', async ({ account }) => {
  const project = await account.call('POST', 'projects', { name: 'Derived project' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Project task', projectId: project.id }, 201);
  const block = await account.call('POST', 'planner/time-blocks', { ...draft(), taskId: task.id }, 201);
  expect(block.projectId).toBe(project.id);
});

test('concurrent note restores create one recovery space', async ({ account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Removed space' }, 201);
  const doc = await account.call('POST', 'documents', { spaceId: space.id, title: 'Recover once' }, 201);
  const siblings = await Promise.all(Array.from({ length: 7 }, (_, index) => account.call('POST', 'documents', { spaceId: space.id, title: `Sibling ${index}` }, 201)));
  for (const active of await account.call('GET', 'spaces')) await account.call('DELETE', `spaces/${active.id}`);
  expect(await account.call('GET', 'spaces')).toHaveLength(0);
  await Promise.all([doc, ...siblings].map(note => account.call('POST', `documents/${note.id}/restore`)));
  const spaces = await account.call('GET', 'spaces');
  expect(spaces).toHaveLength(1);
  for (const note of [doc, ...siblings]) expect((await account.call('GET', `documents/${note.id}`)).spaceId).toBe(spaces[0].id);
  await Promise.all(Array.from({ length: 4 }, () => account.call('POST', `documents/${doc.id}/restore`)));
  expect(await account.call('GET', 'spaces')).toHaveLength(1);
});

test('workspace switching preserves deletion isolation and original-scope recovery', async ({ page, account }) => {
  const other = await account.call('POST', 'workspaces', { name: 'Alternate workspace' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Original workspace task', scheduledDate: `${day()}T12:00:00Z` }, 201);
  await account.signIn(page); await page.goto(`/app/planner?mode=day&date=${day()}`);
  const originalName = await page.locator('button[title^="Active Workspace:"]:visible').first().getAttribute('title');
  await page.getByTitle('Delete task', { exact: true }).click();
  await expect(page.getByText('Task deleted', { exact: true })).toBeVisible();
  await page.locator('button[title^="Active Workspace:"]:visible').first().click();
  await page.getByRole('option', { name: /Alternate workspace/ }).click();
  await expect(page.locator('button[title="Active Workspace: Alternate workspace"]:visible').first()).toBeVisible();
  await account.call('GET', `tasks/${task.id}`, undefined, 404, other.id);
  await account.call('POST', `tasks/${task.id}/restore`, undefined, 404, other.id);
  await account.call('POST', `tasks/${task.id}/restore`);
  await account.call('POST', `tasks/${task.id}/restore`, undefined, 409);
  await page.locator('button[title^="Active Workspace:"]:visible').first().click();
  await page.getByRole('option').filter({ hasText: originalName!.replace('Active Workspace: ', '') }).click();
  await expect(page.locator('button[title^="Active Workspace:"]:visible').first()).toHaveAttribute('title', originalName!);
  await page.goto(`/app/planner?mode=day&date=${day()}`);
  await expect(page.getByText(task.title, { exact: true })).toBeVisible();
});
