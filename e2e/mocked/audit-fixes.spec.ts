import { test, expect, type Page } from '@playwright/test';

async function mockApi(page: Page) {
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/auth/refresh') data = { accessToken: 'regression-token' };
    if (path === '/auth/me') data = { user: { id: 'regression-user', name: 'Tester', memberships: [{ workspaceId: 'ws-1', role: 'OWNER', workspace: { id: 'ws-1', name: 'Test' } }] } };
    if (path === '/workspaces') data = [{ id: 'ws-1', name: 'Test' }];
    return route.fulfill({ json: data });
  });
}

async function confirmDiscard(page: Page, action: () => Promise<void>, discard: boolean) {
  await action();
  const dialog = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: discard ? 'Discard changes' : 'Keep editing', exact: true }).click();
}

for (const parentVersion of [1, 5]) {
  test(`goal switching isolates drafts and versions when parent version is ${parentVersion}`, async ({ page }) => {
    await mockApi(page);
    const base = { type: 'quarterly', icon: 'Target', progress: 10, targetDate: null, createdAt: '2026-10-01T00:00:00Z', metadata: { category: 'health', progressMode: 'manual', status: 'ACTIVE' } };
    const child = { ...base, id: 'child', title: 'Child goal', version: 1, parentGoalId: 'parent', childGoals: [] };
    let parent = { ...base, id: 'parent', title: 'Parent goal', version: parentVersion, parentGoalId: null, childGoals: [child] };
    const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
    await page.route('**/api/v1/goals**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'PATCH') {
        const data = route.request().postDataJSON();
        writes.push({ path, data }); parent = { ...parent, ...data, version: parent.version + 1 };
        return route.fulfill({ json: parent });
      }
      return route.fulfill({ json: path.endsWith('/child') ? child : path.endsWith('/parent') ? parent : [parent, child] });
    });
    await page.goto('/app/goals?goal=child');
    const drawer = page.getByRole('dialog', { name: 'Goal details' });
    await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
    await drawer.getByLabel('Goal title', { exact: true }).fill('Unsaved child draft');
    const switchGoal = () => drawer.getByRole('button', { name: 'Open parent goal: Parent goal', exact: true }).click();
    await confirmDiscard(page, switchGoal, false);
    await expect(page).toHaveURL(/goal=child/);
    await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Unsaved child draft');
    expect(writes).toHaveLength(0);
    await confirmDiscard(page, () => page.keyboard.press('Escape'), false);
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Unsaved child draft');
    await confirmDiscard(page, switchGoal, true);
    await expect(page).toHaveURL(/goal=parent/);
    await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
    await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Parent goal');
    await drawer.getByLabel('Goal title', { exact: true }).fill('Updated parent');
    await drawer.getByRole('button', { name: 'Save Settings', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ path: '/api/v1/goals/parent', data: { title: 'Updated parent', version: parentVersion } });
    await page.goBack();
    await expect(page).toHaveURL(/goal=child/);
    await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
    await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Child goal');
  });
}

for (const type of ['MEETING', 'PERSONAL']) {
  for (const explicit of [false, true]) {
    test(`${type} blocks ${explicit ? 'remain invalid when explicitly selected' : 'do not prevent task-only Focus'}`, async ({ page }) => {
      await mockApi(page);
      const day = '2026-10-15';
      await page.route('**/api/v1/tasks/task-1', route => route.fulfill({ json: { id: 'task-1', title: 'Prepare release', status: 'TODO', estimateMinutes: 45 } }));
      await page.route('**/api/v1/focus-sessions/schedule', route => route.fulfill({ json: { mode: 'empty', plan: [] } }));
      await page.route('**/api/v1/planner/week*', route => route.fulfill({ json: { timeBlocks: [{ id: 'block-1', title: 'Other time', type, date: day + 'T12:00:00Z', taskId: 'task-1', startTime: day + 'T09:00:00Z', endTime: day + 'T09:30:00Z' }] } }));
      await page.goto('/focus?task=task-1&date=' + day + (explicit ? '&block=block-1' : ''));
      if (explicit) {
        await expect(page.getByText('This scheduled task is unavailable. Return to Planner.')).toBeVisible();
      } else {
        const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
        await expect(setup).toContainText('Prepare release'); await expect(setup).toContainText('45 minutes reserved');
      }
    });
  }
}

test('task-only Focus selects an eligible work block after a linked meeting', async ({ page }) => {
  await mockApi(page);
  const day = '2026-10-15';
  const block = { date: day + 'T12:00:00Z', taskId: 'task-1', startTime: day + 'T09:00:00Z', endTime: day + 'T09:30:00Z' };
  await page.route('**/api/v1/tasks/task-1', route => route.fulfill({ json: { id: 'task-1', title: 'Prepare release', status: 'TODO', estimateMinutes: 45 } }));
  await page.route('**/api/v1/focus-sessions/schedule', route => route.fulfill({ json: { mode: 'empty', plan: [] } }));
  await page.route('**/api/v1/planner/week*', route => route.fulfill({ json: { timeBlocks: [{ ...block, id: 'meeting', type: 'MEETING' }, { ...block, id: 'work', type: 'WORK' }] } }));
  await page.goto('/focus?task=task-1&date=' + day);
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toContainText('30 minutes reserved');
});
