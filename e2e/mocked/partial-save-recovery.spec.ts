import { expect, test, type Page } from '@playwright/test';
const day = '2026-10-15';
async function mock(page: Page) {
  await page.route('**/socket.io/**', r => r.abort());
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/auth/refresh') data = { accessToken: 'recheck-token' };
    if (path === '/auth/me') data = { user: { id: 'flow-user', name: 'Recheck', metadata: { focusLayout: 'sidebar' }, memberships: [{ workspaceId: 'ws1', role: 'OWNER', workspace: { id: 'ws1', name: 'Recheck' } }] } };
    if (path === '/workspaces') data = [{ id: 'ws1', name: 'Recheck' }];
    if (path === '/focus-sessions/schedule') data = { mode: 'empty', plan: [] };
    return route.fulfill({ json: data });
  });
}

test('saving a check-in must preserve unsaved settings on the same goal', async ({ page }) => {
  await mock(page);
  let goal = { id: 'g1', title: 'Original title', icon: 'Target', type: 'quarterly', version: 1, progress: 10, parentGoalId: null, childGoals: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  const writes: any[] = [];
  await page.route('**/api/v1/goals**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON(); writes.push(payload);
      goal = { ...goal, ...payload, version: goal.version + 1 };
    }
    return route.fulfill({ json: path.endsWith('/g1') ? goal : [goal] });
  });
  await page.goto('/app/goals?goal=g1');
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  await drawer.getByLabel('Goal title', { exact: true }).fill('Still unsaved settings');
  await drawer.getByRole('tab', { name: 'Overview' }).click();
  await drawer.getByLabel('Check-in note', { exact: true }).fill('A saved reflection');
  await drawer.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).not.toHaveProperty('title');
  await expect(page.getByText('Check-in and reflection saved', { exact: true })).toBeVisible();
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Still unsaved settings');
  await drawer.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({ title: 'Still unsaved settings', version: 2 });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('krama.goal.draft.v1.flow-user.ws1.g1'))).toBeNull();
});

test('saving settings preserves a pending reflection and progress check-in', async ({ page }) => {
  await mock(page);
  let goal = { id: 'g1', title: 'Original title', icon: 'Target', type: 'quarterly', version: 1, progress: 10, parentGoalId: null, childGoals: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  const writes: any[] = [];
  await page.route('**/api/v1/goals**', route => {
    if (route.request().method() === 'PATCH') { const payload = route.request().postDataJSON(); writes.push(payload); goal = { ...goal, ...payload, version: goal.version + 1 }; }
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/g1') ? goal : [goal] });
  });
  await page.goto('/app/goals?goal=g1');
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await drawer.getByLabel('Check-in note', { exact: true }).fill('Pending reflection');
  await drawer.getByRole('button', { name: '25%', exact: true }).click();
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  await drawer.getByLabel('Goal title', { exact: true }).fill('Saved title');
  await drawer.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect(drawer.getByLabel('Check-in note', { exact: true })).toHaveValue('Pending reflection');
  await expect(drawer.getByLabel('Check-in progress percentage', { exact: true })).toHaveValue('25');
  await page.getByRole('button', { name: 'Close toast', exact: true }).click();
  await drawer.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({ progress: 25, note: 'Pending reflection', version: 2 });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('krama.goal.draft.v1.flow-user.ws1.g1'))).toBeNull();
});

for (const section of ['settings', 'checkIn'] as const) {
test(`edits made during a slow ${section} save remain recoverable at the new version`, async ({ page }) => {
  await mock(page);
  let goal = { id: 'g1', title: 'Original title', icon: 'Target', type: 'quarterly', version: 1, progress: 10, parentGoalId: null, childGoals: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => { release = resolve; });
  const writes: any[] = [];
  await page.route('**/api/v1/goals**', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON(); writes.push(payload); await hold;
      goal = { ...goal, ...payload, version: goal.version + 1 };
    }
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/g1') ? goal : [goal] });
  });
  try {
    await page.goto('/app/goals?goal=g1');
    const drawer = page.getByRole('dialog', { name: 'Goal details' });
    if (section === 'settings') await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
    const input = drawer.getByLabel(section === 'settings' ? 'Goal title' : 'Check-in note', { exact: true });
    const button = drawer.getByRole('button', { name: section === 'settings' ? 'Save Settings' : 'Save check-in', exact: true });
    await input.fill('First edit'); await button.click();
    await expect.poll(() => writes.length).toBe(1);
    await input.fill('Newer edit');
    release();
    await expect(input).toHaveValue('Newer edit');
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('krama.goal.draft.v1.flow-user.ws1.g1')!).draftVersion)).toBe(2);
    await button.click(); await expect.poll(() => writes.length).toBe(2);
    expect(writes[1]).toMatchObject({ version: 2, [section === 'settings' ? 'title' : 'note']: 'Newer edit' });
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('krama.goal.draft.v1.flow-user.ws1.g1'))).toBeNull();
  } finally { release(); }
});
}

test('late successful Focus save must retire the completed selection snapshot', async ({ page }) => {
  await mock(page);
  const task = { id: 't1', title: 'First task', version: 1, status: 'TODO', priority: 'HIGH', estimateMinutes: 1 };
  await page.route('**/api/v1/tasks/t1', r => r.fulfill({ json: task }));
  await page.route('**/api/v1/tasks/t2', r => r.fulfill({ json: { ...task, id: 't2', title: 'Second task' } }));
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/api/v1/focus-sessions', async route => {
    const payload = route.request().postDataJSON();
    if (++requests === 1) await hold;
    return route.fulfill({ json: { session: { id: payload.completionId } } });
  });
  try {
    await page.goto('/focus?task=t1&date=' + day);
    await page.getByRole('button', { name: 'Use this plan' }).click();
    await page.clock.install();
    await page.getByTitle('Click or press Enter to start', { exact: true }).click();
    await page.clock.fastForward(60_000);
    await expect.poll(() => requests).toBe(1);
    await page.evaluate(day => { history.pushState({}, '', '/focus?task=t2&date=' + day); window.dispatchEvent(new PopStateEvent('popstate')); }, day);
    await page.getByRole('button', { name: 'Retry saving session' }).click();
    await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toBeVisible();
    const firstReply = page.waitForResponse(response => response.url().endsWith('/focus-sessions') && response.status() === 200);
    release(); await firstReply; await page.clock.runFor(100);
    await page.goBack();
    await expect(page).toHaveTitle(/00:00/);
    const decision = page.getByRole('dialog', { name: 'Is this task done?', exact: true });
    await expect(decision).toBeVisible();
    await expect(decision.getByRole('button', { name: 'Mark task done', exact: true })).toBeEnabled();
    await decision.getByRole('button', { name: 'Keep paused', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review session', exact: true })).toBeEnabled();
  } finally { release(); }
});

test('a changed Planner link cannot prevent saving retained Focus work', async ({ page }) => {
  await mock(page);
  await page.route('**/api/v1/tasks/t1', route => route.fulfill({ json: { id: 't1', title: 'Original task', status: 'TODO', estimateMinutes: 1 } }));
  const payload = { completionId: '00000000-0000-4000-8000-000000000123', taskId: 't1', duration: 60, type: 'custom', startTime: day + 'T09:00:00Z', endTime: day + 'T09:01:00Z', plannerSelectionKey: `ws1:${day}:missing-block:t1` };
  const key = 'krama.focus.unsaved.flow-user.ws1.completion.' + payload.completionId;
  await page.addInitScript(({ key, payload }) => localStorage.setItem(key, JSON.stringify(payload)), { key, payload });
  const writes: any[] = [];
  await page.route('**/api/v1/focus-sessions', async route => {
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { session: { id: payload.completionId } } });
  });
  await page.goto(`/focus?task=t1&block=missing-block&date=${day}`);
  await expect(page.getByText('This scheduled task is unavailable. Return to Planner.', { exact: true })).toBeVisible();
  const retry = page.getByRole('button', { name: 'Retry saving session', exact: true });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(retry).not.toBeVisible();
  const { plannerSelectionKey: _, ...original } = payload;
  expect(writes).toEqual([original]);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toHaveCount(0);
});
