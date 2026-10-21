import { expect, test, type Page, type BrowserContext } from '@playwright/test';

const day = '2026-10-15';
const task = { id: 't1', title: 'Release handoff', status: 'TODO', priority: 'HIGH', version: 1, estimateMinutes: 25, scheduledDate: day + 'T12:00:00Z' };
const planner = { tasks: [], timeBlocks: [], milestones: [], routines: [], occurrences: [], projects: [], goalDeadlines: [], days: [], capacity: { weeklyCapacityMinutes: 2400, occupiedMinutes: 0, meetingMinutes: 0, otherMinutes: 0, freeMinutes: 2400 }, config: { countryCode: 'IN' } };
const dashboard = { stats: { totalProjects: 0, totalTasks: 1, totalHabits: 0, totalNotes: 0, totalGoals: 0 }, today: { tasks: [], overdueTaskIds: [], focusMinutes: 0, focusSessions: [] }, habits: [], goals: [], projects: [], activity: [], focus: { sessions: [] }, features: {}, dateKey: day };

async function mock(target: Page | BrowserContext) {
  await target.route('**/socket.io/**', r => r.abort());
  await target.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/auth/refresh') data = { accessToken: 'flow-token' };
    else if (path === '/auth/me') data = { user: { id: 'flow-user', name: 'Flow Tester', metadata: { focusLayout: 'sidebar', timerPreferences: { focusDuration: 25 } }, memberships: [{ workspaceId: 'ws1', role: 'OWNER', workspace: { id: 'ws1', name: 'Flow' } }] } };
    else if (path === '/workspaces') data = [{ id: 'ws1', name: 'Flow' }];
    else if (path === '/planner/week') data = planner;
    else if (path === '/planner/milestones') data = { milestones: [], goalDeadlines: [] };
    else if (path.endsWith('/holidays')) data = { holidays: [] };
    else if (path === '/focus-sessions/schedule') data = { mode: 'empty', plan: [] };
    else if (path === '/dashboard') data = dashboard;
    else if (path.endsWith('/links')) data = { incoming: [], outgoing: [] };
    else if (path === '/documents') data = { items: [], nextCursor: null };
    return route.fulfill({ json: data });
  });
}

test('due-today tasks remain visible in Planner when scheduled for a later day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T09:00:00Z'));
  await mock(page);
  const conflicting = { ...task, scheduledDate: '2026-10-16T12:00:00Z', dueDate: day + 'T12:00:00Z' };
  await page.route(url => url.pathname === '/api/v1/tasks', r => r.fulfill({ json: [conflicting] }));
  await page.route('**/api/v1/dashboard', r => r.fulfill({ json: { ...dashboard, today: { ...dashboard.today, tasks: [conflicting] } } }));
  await page.route('**/api/v1/planner/week*', r => r.fulfill({ json: { ...planner, tasks: [conflicting] } }));
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: task.title, exact: true })).toBeVisible();
  await page.goto('/app/planner?mode=day&date=' + day);
  await expect(page.getByRole('heading', { name: 'Planner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: task.title, exact: true })).toHaveCount(1);
  await expect(page.getByText('Due today', { exact: true })).toBeVisible();
  await expect(page.getByText('Scheduled after deadline (Oct 16)', { exact: true })).toBeVisible();
});

test('ordinary Focus restores running and paused sessions with the same completion ID', async ({ page }) => {
  await mock(page); await page.goto('/focus');
  const completions: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/focus-sessions', route => { completions.push(route.request().postDataJSON()); return route.fulfill({ json: { session: { id: completions[0].completionId } } }); });
  await expect(page).toHaveTitle(/25:00/);
  await page.clock.install();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(page).toHaveTitle(/24:00/);
  const key = 'krama.focus.active.flow-user.ws1';
  const id = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).session.id, key);
  await page.reload();
  await page.getByTitle('Click or press Enter to pause', { exact: true }).click();
  const paused = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), key);
  expect(paused.session.id).toBe(id); expect(paused.remaining).toBeLessThanOrEqual(1440); expect(paused.remaining).toBeGreaterThan(1430);
  await page.reload();
  await expect(page.getByTitle('Click or press Enter to start', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).session.id, key)).toBe(id);
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(25 * 60_000);
  await expect.poll(() => completions.length).toBe(1);
  expect(completions[0]).toMatchObject({ completionId: id, duration: 1500 });
  await expect.poll(() => page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
});

test('goal drafts survive browser history and save only to their original goal', async ({ page }) => {
  await mock(page);
  const base = { type: 'quarterly', icon: 'Target', version: 1, progress: 10, targetDate: null, createdAt: day + 'T00:00:00Z', metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  const child = { ...base, id: 'child', title: 'Child goal', parentGoalId: 'parent', childGoals: [] };
  const parent = { ...base, id: 'parent', title: 'Parent goal', parentGoalId: null, childGoals: [child] };
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  let confirmations = 0;
  page.on('dialog', async dialog => { confirmations++; await dialog.dismiss(); });
  await page.route('**/api/v1/goals**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') writes.push({ path, body: route.request().postDataJSON() });
    return route.fulfill({ json: path.endsWith('/parent') ? parent : path.endsWith('/child') ? child : [parent, child] });
  });
  await page.goto('/app/goals?goal=parent');
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  for (const radio of await drawer.getByRole('radio').all()) await expect(radio).toBeDisabled();
  await drawer.getByRole('tab', { name: 'Overview' }).click();
  await drawer.getByRole('button', { name: 'Select key result: Child goal', exact: true }).click();
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  await drawer.getByLabel('Goal title', { exact: true }).fill('Unsaved history draft');
  await page.goBack();
  await expect(page).toHaveURL(/goal=parent/);
  await page.goForward();
  await expect(page).toHaveURL(/goal=child/);
  await drawer.getByRole('tab', { name: 'Edit Settings' }).click();
  await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Unsaved history draft');
  expect(confirmations).toBe(0); expect(writes).toHaveLength(0);
  await drawer.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ path: '/api/v1/goals/child', body: { title: 'Unsaved history draft', version: 1 } });
});

test('two offline Focus tabs recover both completions independently after reload', async ({ page, context }) => {
  await mock(context);
  const second = { ...task, id: 't2', title: 'Second task', estimateMinutes: 30 };
  await context.route('**/api/v1/tasks/t1', r => r.fulfill({ json: task }));
  await context.route('**/api/v1/tasks/t2', r => r.fulfill({ json: second }));
  let offline = true;
  const saved = new Map<string, Record<string, unknown>>();
  await context.route('**/api/v1/focus-sessions', route => {
    const payload = route.request().postDataJSON();
    if (offline) return route.fulfill({ status: 503, json: { message: 'Offline' } });
    saved.set(payload.completionId, payload);
    return route.fulfill({ json: { session: { id: payload.completionId } } });
  });
  const other = await context.newPage();
  await page.goto('/focus?task=t1&date=' + day);
  await other.goto('/focus?task=t2&date=' + day);
  for (const tab of [page, other]) {
    await tab.getByRole('button', { name: 'Use this plan', exact: true }).click();
    await tab.clock.install();
    await tab.getByTitle('Click or press Enter to start', { exact: true }).click();
  }
  const key = 'krama.focus.unsaved.flow-user.ws1.completion.';
  const pending = () => page.evaluate(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => JSON.parse(localStorage.getItem(key)!)), key);
  await page.clock.fastForward(25 * 60_000);
  await expect.poll(async () => (await pending()).map(row => row.taskId)).toEqual(['t1']);
  await other.clock.fastForward(5 * 60_000);
  await expect.poll(async () => (await pending()).map(row => row.taskId).sort()).toEqual(['t1', 't2']);
  await page.reload();
  await expect(page.getByText('Your session has not been saved.', { exact: true })).toBeVisible();
  expect((await pending()).map(row => row.taskId).sort()).toEqual(['t1', 't2']);
  // Let the second tab exhaust its automatic retries before reconnecting.
  await expect(other.getByRole('button', { name: 'Retry saving session', exact: true })).toBeVisible();
  offline = false;
  await page.getByRole('button', { name: 'Retry saving session', exact: true }).click();
  await expect.poll(() => [...saved.values()].some(row => row.taskId === 't1')).toBe(true);
  await other.getByRole('button', { name: 'Retry saving session', exact: true }).click();
  await expect.poll(() => [...saved.values()].map(row => row.taskId).sort()).toEqual(['t1', 't2']);
  await expect.poll(() => pending()).toHaveLength(0);
});

test('recovered goal drafts retain their original version on conflict and clear only after discard', async ({ page }) => {
  await mock(page);
  const goal = { id: 'stale', title: 'Server title', type: 'quarterly', icon: 'Target', version: 7, progress: 10, parentGoalId: null, childGoals: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
  const key = 'krama.goal.draft.v1.flow-user.ws1.stale';
  await page.addInitScript(key => sessionStorage.setItem(key, JSON.stringify({ schema: 1, draftVersion: 3, activeTab: 'edit', note: '', progressInput: 10, measurableInput: '', editTitle: 'Recovered draft', editIcon: 'Target', editWhy: '', editCategory: 'health', editTargetDate: '', editProgressMode: 'manual' })), key);
  const writes: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/goals**', route => {
    if (route.request().method() === 'PATCH') {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ status: 409, json: { message: 'Conflict: version mismatch' } });
    }
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/stale') ? goal : [goal] });
  });
  await page.goto('/app/goals?goal=stale');
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await expect(drawer.getByLabel('Goal title', { exact: true })).toHaveValue('Recovered draft');
  await drawer.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect(page.getByText(/Failed to update details: Conflict/)).toBeVisible();
  expect(writes).toHaveLength(1); expect(writes[0].version).toBe(3);
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).draftVersion, key)).toBe(3);
  await drawer.getByRole('button', { name: 'Close goal details', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Discard unsaved changes?' }).getByRole('button', { name: 'Keep editing' }).click();
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).not.toBeNull();
  await drawer.getByRole('button', { name: 'Close goal details', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Discard unsaved changes?' }).getByRole('button', { name: 'Discard changes' }).click();
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
});

test('weekly habit counts preserve calendar days across the UTC+14 week boundary', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Pacific/Kiritimati' });
  try {
    const page = await context.newPage(); await mock(page);
    await page.clock.install({ time: new Date('2026-10-18T01:00:00Z') });
    await page.goto('/login');
    const result = await page.evaluate(async () => {
      // @ts-expect-error The module is served by Vite inside the test browser.
      const { weeklyCompletionCount } = await import('/src/lib/habitFilters.ts');
      return { localDay: new Date().toLocaleDateString('en-CA'), count: weeklyCompletionCount({ cadence: 'weekly', completions: [{ date: '2026-10-17T12:00:00Z', offSchedule: false }] }) };
    });
    expect(result.count).toBe(0);
  } finally { await context.close(); }
});

test('project timeline preserves its target calendar date in western timezones', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
  try {
    const page = await context.newPage(); await mock(page);
    const project = { id: 'p1', name: 'Calendar project', status: 'active', version: 1, metadata: {}, targetDate: day + 'T00:00:00Z', tasks: [], documents: [], milestones: [], createdAt: day + 'T00:00:00Z', updatedAt: day + 'T00:00:00Z' };
    await page.route('**/api/v1/projects', r => r.fulfill({ json: [project] }));
    await page.route('**/api/v1/projects/p1', r => r.fulfill({ json: project }));
    await page.goto('/app/projects/p1');
    await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
    await page.keyboard.press('4');
    await expect(page.getByText('Target deadline: Oct 15, 2026', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

for (const patchStatus of [200, 500, 409]) {
test(`Brain waits for its project change and handles save status ${patchStatus} before creating a task`, async ({ page }) => {
  await mock(page);
  let document = { id: 'doc1', title: 'Flow note', spaceId: 'space1', parentId: null, projectId: 'p1', tags: [], statusBadges: [], contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build release' }] }] }, createdAt: day + 'T00:00:00Z', updatedAt: day + 'T00:00:00.000Z' };
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => { release = resolve; });
  let metadataPending = false;
  const created: Array<{ projectId: string; duringMetadataSave: boolean }> = [];
  await page.route('**/api/v1/projects', r => r.fulfill({ json: [{ id: 'p1', name: 'Old project', tasks: [] }, { id: 'p2', name: 'New project', tasks: [] }] }));
  await page.route('**/api/v1/spaces', r => r.fulfill({ json: [{ id: 'space1', name: 'Notes' }] }));
  await page.route('**/api/v1/documents*', r => r.fulfill({ json: { items: [document], nextCursor: null } }));
  await page.route('**/api/v1/documents/doc1', async route => {
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON(); metadataPending = true;
      await hold;
      if (patchStatus !== 200) { metadataPending = false; return route.fulfill({ status: patchStatus, json: { message: 'Document change rejected' } }); }
      document = { ...document, ...patch, updatedAt: day + 'T00:00:01.000Z' }; metadataPending = false;
    }
    return route.fulfill({ json: document });
  });
  await page.route('**/api/v1/documents/doc1/links', r => r.fulfill({ json: { incoming: [], outgoing: [] } }));
  await page.route('**/api/v1/documents/doc1/tasks', route => {
    created.push({ projectId: document.projectId, duringMetadataSave: metadataPending });
    return route.fulfill({ json: { task: { ...task, title: route.request().postDataJSON().title, projectId: document.projectId }, link: { id: 'link1' } } });
  });
  try {
    await page.goto('/app/brain?doc=doc1');
  await page.locator('.workspace-document-properties > summary').click();
    await page.getByLabel('Linked project', { exact: true }).selectOption('p2');
    await expect.poll(() => metadataPending).toBe(true);
    await page.keyboard.press('Control+Shift+T');
    const dialog = page.getByRole('dialog', { name: 'Create Execution Task', exact: true });
    await dialog.getByLabel('Task title', { exact: true }).fill('Task from moving note');
    await dialog.getByRole('button', { name: 'Create & Link Task', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Linking...', exact: true })).toBeVisible();
    expect(created).toHaveLength(0);
    release();
    if (patchStatus !== 200) {
      await expect(page.getByText(/Save your document changes before creating a task/)).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Create & Link Task', exact: true })).toBeEnabled();
      expect(created).toHaveLength(0); expect(document.projectId).toBe('p1');
      return;
    }
    await expect.poll(() => created.length).toBe(1);
    expect(created[0]).toEqual({ projectId: 'p2', duringMetadataSave: false });
    await expect.poll(() => document.projectId).toBe('p2');
  } finally { release(); }
});
}
