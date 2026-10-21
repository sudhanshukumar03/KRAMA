import { expect, test, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backup = JSON.parse(readFileSync(resolve('e2e/fixtures/personal-backup.json'), 'utf8'));
const day = '2026-10-15';
const userId = backup.workspace.members[0].user.id;

async function mock(context: BrowserContext) {
  const tasks: any[] = structuredClone(backup.workspace.tasks);
  const documents: any[] = structuredClone(backup.workspace.spaces[0].documents.filter((doc: any) => !doc.deletedAt));
  let plan: any = { taskIds: [], decisions: {}, reviewedAt: null, revision: 0 };
  let captureFailure = false;
  let restored = false;
  let writes = 0;
  let activeUser = userId;
  const project = { ...backup.workspace.projects[0], goalId: null, tasks: undefined, _count: { tasks: 2, documents: 1 } };
  for (let index = 40; index < 44; index++) tasks.push({ ...tasks[0], id: `00000000-0000-0000-0000-0000000000${index}`, title: `Personal task ${index}`, blockedById: null, projectId: null, scheduledDate: null, dueDate: null, metadata: {} });
  await context.route('**/socket.io/**', route => route.abort());
  await context.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    const payload = method === 'POST' || method === 'PATCH' || method === 'PUT' ? route.request().postDataJSON() : null;
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'personal-test-token' };
    else if (path === '/auth/me') data = { user: { id: activeUser, name: 'Reader', email: 'reader@example.test', metadata: {}, memberships: [{ workspaceId: backup.workspace.id, role: 'OWNER', workspace: { id: backup.workspace.id, name: 'Personal' } }, ...(restored ? [{ workspaceId: 'new-personal-workspace', role: 'OWNER', workspace: { id: 'new-personal-workspace', name: 'Personal (restored)' } }] : [])] } };
    else if (path === '/workspaces') data = [backup.workspace, ...(restored ? [{ id: 'new-personal-workspace', name: 'Personal (restored)' }] : [])];
    else if (path === '/workspaces/restore') { restored = true; writes++; data = { id: 'new-personal-workspace', name: 'Personal (restored)' }; }
    else if (path === '/dashboard/day-plan') {
      if (method === 'PUT') {
        if (payload.taskIds && payload.expectedRevision !== plan.revision) return route.fulfill({ status: 409, json: { message: 'Your daily plan changed in another tab. Refresh and try again.' } });
        if (payload.taskIds) plan = { ...plan, taskIds: payload.taskIds };
        if (payload.review) {
          const { taskId, action } = payload.review;
          const task = tasks.find(task => task.id === taskId)!;
          if (task.version !== payload.review.version) return route.fulfill({ status: 409, json: { message: 'This task changed. Refresh and try again.' } });
          task.status = action === 'cancel' ? 'CANCELED' : action === 'backlog' ? 'BACKLOG' : 'TODO';
          task.scheduledDate = action === 'tomorrow' ? '2026-10-16T12:00:00.000Z' : null;
          task.version++; task.metadata.inbox = false;
          plan = { ...plan, taskIds: plan.taskIds.filter((id: string) => id !== taskId), decisions: { ...plan.decisions, [taskId]: { action, at: day + 'T12:00:00Z' } } };
        }
        plan.revision++;
      }
      data = plan;
    }
    else if (path === '/dashboard') data = { dateKey: day, stats: { totalTasks: tasks.length }, today: { tasks: tasks.filter(task => task.status !== 'CANCELED' && (task.scheduledDate?.slice(0, 10) <= day || task.dueDate?.slice(0, 10) <= day)), overdueTaskIds: [], focusMinutes: 0, focusSessions: [] }, habits: [], projects: [], goals: [], activity: [], focus: { sessions: [] }, features: {} };
    else if (path === '/tasks') {
      if (method === 'POST') {
        if (captureFailure) return route.fulfill({ status: 500, json: { message: 'Could not save' } });
        data = { ...tasks[0], ...payload, id: crypto.randomUUID(), blockedById: null, projectId: null, version: 1 };
        tasks.push(data);
      } else data = url.searchParams.get('status') === 'CANCELED' ? tasks.filter(task => task.status === 'CANCELED') : tasks.filter(task => task.status !== 'CANCELED');
    }
    else if (path.startsWith('/tasks/')) {
      const task = tasks.find(task => task.id === path.split('/')[2]);
      if (method === 'PATCH' && task) Object.assign(task, payload, { version: task.version + 1 });
      data = task || {};
    }
    else if (path === '/documents') {
      if (method === 'POST') {
        if (captureFailure) return route.fulfill({ status: 500, json: { message: 'Could not save' } });
        const doc = { ...documents[0], ...payload, id: crypto.randomUUID(), updatedAt: day + 'T12:00:00Z' }; documents.push(doc); data = doc;
      } else data = { items: documents, nextCursor: null };
    }
    else if (path.startsWith('/documents/')) {
      const doc = documents.find(doc => doc.id === path.split('/')[2]);
      if (method === 'PATCH' && doc) Object.assign(doc, payload);
      data = path.endsWith('/links') ? { incoming: [], outgoing: [] } : doc || {};
    }
    else if (path === '/projects') data = [project];
    else if (path.startsWith('/projects/')) data = project;
    else if (path === '/spaces') data = [{ id: backup.workspace.spaces[0].id, name: 'Notes' }];
    else if (path === '/focus-sessions/schedule') data = { mode: 'empty', plan: [] };
    return route.fulfill({ json: data });
  });
  return { tasks, documents, getPlan: () => plan, failCapture: (fail: boolean) => { captureFailure = fail; }, getRestores: () => writes, changeUser: (id: string) => { activeUser = id; } };
}

test('Quick Capture preserves separate drafts through closing, mode changes, reload and failed saves', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/inbox');
  const open = async () => page.getByRole('button', { name: 'Capture something', exact: true }).click();
  await open();
  const dialog = page.getByRole('dialog', { name: 'Quick capture' });
  await dialog.getByLabel('Title', { exact: true }).fill('A task I cannot lose');
  await dialog.getByLabel('Details').fill('Keep these task details');
  await dialog.getByRole('button', { name: 'Note', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('An unfinished note');
  await page.keyboard.press('Escape');
  await open();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('A task I cannot lose');
  await expect(dialog.getByLabel('Details')).toHaveValue('Keep these task details');
  state.failCapture(true);
  await dialog.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('draft is retained');
  await page.reload(); await open();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('A task I cannot lose');
  await dialog.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('An unfinished note');
  await dialog.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Task', exact: true }).click();
  state.failCapture(false);
  await dialog.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'File A task I cannot lose', exact: true })).toBeVisible();
  await open(); await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('');
});

test('capture drafts are scoped to the signed-in person', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/inbox'); await page.getByRole('button', { name: 'Capture something' }).click();
  await page.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true }).fill('Private unfinished thought');
  state.changeUser('00000000-0000-0000-0000-000000000300');
  await page.reload(); await page.getByRole('button', { name: 'Capture something' }).click();
  await expect(page.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true })).toHaveValue('');
});

test('a late capture save cannot erase another tab’s newer draft', async ({ page, context }) => {
  await mock(context);
  let release: () => void = () => {};
  let started: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  const saving = new Promise<void>(resolve => { started = resolve; });
  await context.route('**/api/v1/tasks', async route => {
    if (route.request().method() === 'POST') { started(); await pending; }
    return route.fallback();
  });
  await page.goto('/app/inbox'); await page.getByRole('button', { name: 'Capture something' }).click();
  const first = page.getByRole('dialog', { name: 'Quick capture' });
  await first.getByLabel('Title', { exact: true }).fill('The task being saved');
  // Prepare both app shells before holding a request. This keeps development
  // module startup out of the save/draft race being tested.
  const second = await context.newPage();
  await second.goto('/app/inbox');
  await expect(second.getByRole('button', { name: 'Capture something' })).toBeVisible();
  await first.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
  await saving;
  await second.getByRole('button', { name: 'Capture something' }).click();
  await second.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true }).fill('A different unfinished task');
  release(); await expect(first).not.toBeVisible();
  await second.reload(); await second.getByRole('button', { name: 'Capture something' }).click();
  await expect(second.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true })).toHaveValue('A different unfinished task');
});

test('failed captures remain recoverable in each tab after another tab edits the same mode', async ({ page, context }) => {
  const state = await mock(context);
  state.failCapture(true);
  await page.goto('/app/inbox'); await page.getByRole('button', { name: 'Capture something' }).click();
  await page.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true }).fill('First tab unsaved task');
  await page.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/app/inbox'); await second.getByRole('button', { name: 'Capture something' }).click();
  await second.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true }).fill('Second tab unsaved task');
  for (const [tab, title] of [[page, 'First tab unsaved task'], [second, 'Second tab unsaved task']] as const) {
    await tab.reload(); await tab.getByRole('button', { name: 'Capture something' }).click();
    await expect(tab.getByRole('dialog', { name: 'Quick capture' }).getByLabel('Title', { exact: true })).toHaveValue(title);
  }
});

test('Inbox files notes and schedules tasks without deleting either item', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'File Reading notes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'File Reading notes', exact: true })).toHaveCount(0);
  expect(state.documents[0].statusBadges).not.toContain('Inbox');
  await page.getByRole('button', { name: 'Schedule today: Study chapter 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Schedule today: Study chapter 3', exact: true })).toHaveCount(0);
  expect(state.tasks[0]).toMatchObject({ status: 'TODO', scheduledDate: day + 'T12:00:00.000Z', metadata: { inbox: false } });
  expect(state.documents).toHaveLength(1); expect(state.tasks).toHaveLength(6);
});

test('notes, ideas and links all appear in the same Inbox with their captured content', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/inbox');
  for (const mode of ['Note', 'Idea', 'Link']) {
    await page.getByRole('button', { name: 'Capture something', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Quick capture' });
    await dialog.getByRole('button', { name: mode, exact: true }).click();
    await dialog.getByLabel('Title', { exact: true }).fill('Captured ' + mode);
    await dialog.getByLabel(mode === 'Link' ? 'Link URL' : 'Details').fill(mode === 'Link' ? 'https://example.test/reading' : 'Keep this content');
    await dialog.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
    await expect(page.getByRole('button', { name: 'File Captured ' + mode, exact: true })).toBeVisible();
    const doc = state.documents.find(doc => doc.title === 'Captured ' + mode)!;
    expect(doc.statusBadges).toContain('Inbox');
    expect(JSON.stringify(doc.contentJson)).toContain(mode === 'Link' ? 'https://example.test/reading' : 'Keep this content');
  }
});

test('three chosen priorities survive reload and launch their exact task in a separate Focus tab', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/');
  const picker = page.getByLabel('priorities chosen', { exact: false });
  const candidates = state.tasks.filter(task => task.title.startsWith('Personal task'));
  for (const task of candidates.slice(0, 3)) { await expect(picker).toBeEnabled(); await picker.selectOption(task.id); }
  // Disabled also means a save is pending. Wait for its acknowledgement before
  // asserting the persisted three-priority limit.
  await expect(page.getByRole('region', { name: 'Daily planning' })).toHaveAttribute('aria-busy', 'false');
  await expect(picker).toBeDisabled();
  expect(state.getPlan().taskIds).toHaveLength(3);
  await page.reload();
  const panel = page.getByRole('region', { name: 'Daily planning' });
  await expect(panel.getByText(candidates[0].title, { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: `Remove priority ${candidates[1].title}`, exact: true }).click();
  await expect(picker).toBeEnabled(); await picker.selectOption(candidates[3].id);
  const popupPromise = page.waitForEvent('popup');
  await page.locator('section').filter({ has: page.getByRole('heading', { name: "Today's Focus", exact: true }) }).getByRole('button', { name: 'Start Focus', exact: true }).click();
  const popup = await popupPromise; await popup.waitForURL('**/focus?**');
  expect(new URL(popup.url()).searchParams.get('task')).toBe(candidates[0].id);
  expect(new URL(popup.url()).searchParams.get('date')).toBe(day);
});

test('a stale priority tab refreshes after conflict and can add its choice without losing the other tab’s task', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/');
  const second = await context.newPage();
  let allowRefresh = false;
  await context.route('**/api/v1/dashboard/day-plan?**', async route => {
    if (route.request().frame().page() !== second) return route.fallback();
    if (route.request().method() === 'PUT') allowRefresh = true;
    else if (!allowRefresh) return route.fulfill({ json: { taskIds: [], decisions: {}, reviewedAt: null, revision: 0 } });
    return route.fallback();
  });
  await second.goto('/app/');
  const picker = page.getByLabel('priorities chosen', { exact: false });
  const stalePicker = second.getByLabel('priorities chosen', { exact: false });
  await expect(stalePicker).toBeEnabled();
  await picker.selectOption(state.tasks[2].id);
  await expect(page.getByRole('button', { name: 'Remove priority ' + state.tasks[2].title })).toBeVisible();
  await stalePicker.selectOption(state.tasks[3].id);
  await expect(second.getByText('Your daily plan changed in another tab. Refresh and try again.', { exact: true })).toBeVisible();
  expect(state.getPlan().taskIds).toEqual([state.tasks[2].id]);
  await expect(second.getByRole('button', { name: 'Remove priority ' + state.tasks[2].title })).toBeVisible();
  await expect(stalePicker).toBeEnabled();
  await stalePicker.selectOption(state.tasks[3].id);
  await expect(second.getByRole('button', { name: 'Remove priority ' + state.tasks[3].title })).toBeVisible();
  expect(state.getPlan().taskIds).toEqual([state.tasks[2].id, state.tasks[3].id]);
});

test('day-end review saves tomorrow, backlog and cancel choices and keeps them reviewed after reload', async ({ page, context }) => {
  const state = await mock(context);
  const tasks = state.tasks.filter(task => task.title.startsWith('Personal task')).slice(0, 3);
  for (const task of tasks) { task.scheduledDate = day + 'T12:00:00.000Z'; task.dueDate = day + 'T12:00:00.000Z'; }
  await page.goto('/app/'); await page.getByRole('button', { name: 'Review unfinished work', exact: true }).click();
  for (const [index, label] of ['Do tomorrow', 'Return to backlog', 'Cancel task'].entries()) {
    const button = page.getByRole('button', { name: `${label}: ${tasks[index].title}`, exact: true });
    await expect(button).toBeEnabled(); await button.click(); await expect(button).toHaveCount(0);
  }
  expect(tasks[0].scheduledDate).toContain('2026-10-16');
  expect(tasks[1]).toMatchObject({ status: 'BACKLOG', scheduledDate: null });
  expect(tasks[2].status).toBe('CANCELED');
  expect(tasks.every(task => task.dueDate === day + 'T12:00:00.000Z')).toBeTruthy();
  await page.reload(); await page.getByRole('button', { name: 'Review unfinished work', exact: true }).click();
  for (const task of tasks) await expect(page.getByRole('button', { name: `Do tomorrow: ${task.title}`, exact: true })).toHaveCount(0);
  for (const task of tasks) await expect(page.getByRole('heading', { name: task.title, exact: true })).toHaveCount(0);
});

test('priority alone is not a blocker; an unresolved dependency is shown and cannot be suggested for Focus', async ({ page, context }) => {
  const state = await mock(context);
  state.tasks[0].priority = 'HIGH';
  await page.goto('/app/projects/' + backup.workspace.projects[0].id);
  await expect(page.getByText('ON TRACK', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('ATTENTION: BLOCKERS DETECTED', { exact: true })).toHaveCount(0);
  state.tasks[1].status = 'TODO';
  await page.reload();
  await expect(page.getByText('ATTENTION: BLOCKERS DETECTED', { exact: true }).first()).toBeVisible();
  await page.goto('/app/');
  const picker = page.getByLabel('priorities chosen', { exact: false });
  await picker.selectOption(state.tasks[0].id);
  const panel = page.getByRole('region', { name: 'Daily planning' });
  await expect(panel.getByText('Waiting for Collect reading material', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Start Focus for Study chapter 3', exact: true })).toBeDisabled();
});

test('when all today tasks are blocked the dashboard explains the prerequisites and offers task review', async ({ page, context }) => {
  const state = await mock(context);
  state.tasks[1].status = 'TODO';
  state.tasks[1].blockedById = state.tasks[2].id;
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Your tasks are waiting', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review tasks', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board/);
});

test('backup restore previews the file and creates a separate workspace once', async ({ page, context }) => {
  const state = await mock(context);
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Restore personal workspace' });
  await expect(dialog.getByRole('button', { name: 'Restore as new workspace' })).toBeDisabled();
  await dialog.getByLabel('Backup file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(dialog.getByRole('alert')).toContainText('Krama version 2');
  await dialog.getByLabel('Backup file').setInputFiles('e2e/fixtures/personal-backup.json');
  await expect(dialog.getByText('Personal', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Restore as new workspace' }).click();
  await expect(dialog.getByRole('status')).toContainText('Personal (restored)');
  expect(state.getRestores()).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Restore as new workspace' })).toHaveCount(0);
});

for (const theme of ['light', 'dark']) test(`personal Inbox and review fit a small screen in ${theme} mode with reduced motion`, async ({ page, context }) => {
  await mock(context);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), theme);
  await page.goto('/app/inbox');
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: `test-results/artifacts/personal-inbox-${theme}.png`, fullPage: true });
  await page.goto('/app/'); await page.getByRole('button', { name: 'Review unfinished work', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Close your day', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: `test-results/artifacts/personal-review-${theme}.png`, fullPage: true });
});
