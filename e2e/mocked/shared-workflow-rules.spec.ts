// Regression tests for shared workspace, daily-date, dependency and keyboard ownership rules.
// All records and API responses are synthetic. No personal workspace data is used.
import { test, expect, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bugFixture } from '../fixtures/current-bug-fixture';
const backup = JSON.parse(readFileSync('e2e/fixtures/personal-backup.json', 'utf8'));
test.use({ timezoneId: 'Asia/Kolkata' });
const project = { id: 'followup-project', name: 'Available project', problemStatement: 'Synthetic project for review', status: 'active', version: 1, position: 1, metadata: { tags: [] }, createdAt: '2026-10-17T08:00:00.000Z', updatedAt: '2026-10-17T08:00:00.000Z', _count: { tasks: 0, documents: 0 }, milestones: [] };
const goal = { ...backup.workspace.goals[0], id: 'followup-goal', title: 'Available goal', parentGoalId: null, childGoals: [], snapshots: [], metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual' } };
async function projectFixture(context: BrowserContext) {
  const state = await bugFixture(context);
  await context.route('**/api/v1/projects**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/projects') ? [project] : project }));
  return state;
}

for (const dependency of ['projects', 'habits']) test(`Healthy Goals remain usable when ${dependency} fails`, async ({ page, context }) => {
  await bugFixture(context);
  await context.route('**/api/v1/goals**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/goals/followup-goal') ? goal : [goal] }));
  await context.route(`**/api/v1/${dependency}**`, route => route.fulfill({ status: 503, json: { message: 'Synthetic secondary outage' } }));
  const loaded = page.waitForResponse(response => response.url().endsWith('/api/v1/goals') && response.status() === 200);
  await page.goto('/app/goals'); await loaded;
  await expect(page.getByRole('alert')).toContainText('Some goal connections are unavailable', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Open Cockpit for Available goal', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Goal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Cockpit for Available goal', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Goal details', exact: true });
  await expect(drawer.getByRole('button', { name: 'Edit Settings', exact: true })).toBeVisible();
  await expect(drawer.getByRole('group', { name: dependency === 'projects' ? 'Connected projects' : 'Connected habits', exact: true }).getByRole('button').first()).toBeDisabled();
});

test('A healthy project detail remains usable when only its project list fails', async ({ page, context }) => {
  await projectFixture(context);
  await context.route('**/api/v1/projects', route => route.fulfill({ status: 503, json: { message: 'Synthetic list outage' } }));
  const loaded = page.waitForResponse(response => response.url().endsWith('/api/v1/projects/followup-project') && response.status() === 200);
  await page.goto('/app/projects/followup-project'); await loaded;
  await expect(page.getByRole('alert')).toContainText('Some linked details are unavailable', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
});

test('Cancelling an unsaved-work navigation retains the original workspace and save scope', async ({ page, context }) => {
  await bugFixture(context);
  await context.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { ...backup.workspace.members[0].user, id: 'review-user', memberships: [
    { workspaceId: 'review-workspace', role: 'OWNER', workspace: { id: 'review-workspace', name: 'Original workspace' } },
    { workspaceId: 'other-workspace', role: 'OWNER', workspace: { id: 'other-workspace', name: 'Other workspace' } },
  ] } } }));
  const saveWorkspaces: string[] = [];
  await context.route('**/api/v1/documents/review-document/content', route => {
    saveWorkspaces.push(route.request().headers()['x-workspace-id']);
    return route.fulfill({ status: 503, json: { message: 'Synthetic failed save' } });
  });
  await page.goto('/app/brain?doc=review-document');
  await page.getByRole('textbox', { name: 'Document body', exact: true }).fill('Unsaved original-workspace draft');
  await expect(page.getByRole('status').filter({ hasText: /^Save failed/ })).toBeVisible();
  const originalUrl = page.url();
  let cancelled = false;
  page.on('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); cancelled = true; await dialog.dismiss(); });
  await page.getByTitle('Active Workspace: Original workspace', { exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('option', { name: /Other workspace/ }).click();
  await expect.poll(() => cancelled).toBe(true);
  await expect(page).toHaveURL(originalUrl);
  await expect(page.getByRole('textbox', { name: 'Document body', exact: true })).toHaveText('Unsaved original-workspace draft');
  expect(await page.evaluate(() => localStorage.getItem('krama_active_workspace'))).toBe('review-workspace');
  await expect(page.getByTitle('Active Workspace: Original workspace', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const beforeRetry = saveWorkspaces.length;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect.poll(() => saveWorkspaces.length).toBeGreaterThan(beforeRetry);
  expect(saveWorkspaces.at(-1)).toBe('review-workspace');
});

test('Inbox Do today schedules the current day across midnight', async ({ page, context }) => {
  await bugFixture(context);
  let serverDay = '2026-10-17';
  await context.route('**/api/v1/dashboard', route => route.fulfill({ json: { dateKey: serverDay, stats: {}, today: { tasks: [] }, habits: [], projects: [], goals: [], activity: [] } }));
  await page.clock.install({ time: new Date('2026-10-17T23:59:55+05:30') });
  await page.goto('/app/inbox');
  const schedule = page.getByRole('button', { name: 'Schedule today: Task to organise', exact: true });
  await expect(schedule).toBeEnabled();
  serverDay = '2026-10-18';
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => new Date().getDate())).toBe(18);
  const write = page.waitForRequest(request => request.url().endsWith('/api/v1/tasks/review-task') && request.method() === 'PATCH');
  await schedule.click();
  expect((await write).postDataJSON().scheduledDate).toBe('2026-10-18T12:00:00.000Z');
});

test('Keyboard help owns project shortcuts and does not open a second dialog', async ({ page, context }) => {
  await projectFixture(context);
  await page.goto('/app/projects/followup-project');
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard Shortcuts', exact: true });
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: 'ESC', exact: true }).focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(help).toBeVisible();
});

test('Project shortcuts yield to the advertised E W Planner navigation chord', async ({ page, context }) => {
  await projectFixture(context);
  await page.goto('/app/projects/followup-project');
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
  await page.keyboard.press('e');
  const edit = page.getByRole('dialog', { name: 'Edit Project Settings', exact: true });
  await expect(edit).toHaveCount(0);
  await page.keyboard.press('w');
  await expect(page).toHaveURL(/\/app\/planner/);
  await expect(edit).toHaveCount(0);
});

test('Accepted workspace navigation commits the new scope after preserving the old draft', async ({ page, context }) => {
  await bugFixture(context);
  await context.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { ...backup.workspace.members[0].user, id: 'review-user', memberships: [
    { workspaceId: 'review-workspace', role: 'OWNER', workspace: { id: 'review-workspace', name: 'Original workspace' } },
    { workspaceId: 'other-workspace', role: 'OWNER', workspace: { id: 'other-workspace', name: 'Other workspace' } },
  ] } } }));
  const saveScopes: string[] = [];
  await context.route('**/api/v1/documents/review-document/content', route => {
    saveScopes.push(route.request().headers()['x-workspace-id']);
    return route.fulfill({ status: 503, json: { message: 'Synthetic failure' } });
  });
  await page.goto('/app/brain?doc=review-document');
  await page.getByRole('textbox', { name: 'Document body', exact: true }).fill('Keep this original workspace draft');
  await expect(page.getByRole('status').filter({ hasText: /^Save failed/ })).toBeVisible();
  page.on('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); await dialog.accept(); });
  await page.getByTitle('Active Workspace: Original workspace', { exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('option', { name: /Other workspace/ }).click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('krama_active_workspace'))).toBe('other-workspace');
  expect(saveScopes.every(scope => scope === 'review-workspace')).toBe(true);
  const draft = await page.evaluate(() => localStorage.getItem('krama:document-draft:v1:review-user:review-workspace:review-document'));
  expect(draft).toContain('Keep this original workspace draft');
});

test('Project task outages leave settings, documents and project editing usable', async ({ page, context }) => {
  const state = await projectFixture(context); state.tasksBroken = true;
  await page.goto('/app/projects/followup-project');
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Project tasks are unavailable', exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('tab', { name: /^Settings/ }).click();
  await expect(page.getByRole('button', { name: 'Open Settings Editor', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /^Docs/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('No');
  await page.getByRole('button', { name: 'Edit Project', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit Project Settings', exact: true })).toBeVisible();
});

test('Brain project outages preserve the document editor and disable unavailable link choices', async ({ page, context }) => {
  const state = await bugFixture(context);
  state.documents[0].projectId = 'followup-project';
  await context.route('**/api/v1/projects**', route => route.fulfill({ status: 503, json: { message: 'Synthetic project failure' } }));
  await page.goto('/app/brain?doc=review-document&projectId=followup-project');
  await expect(page.getByRole('textbox', { name: 'Document body', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Project links are unavailable', { timeout: 15000 });
  await page.locator('.workspace-document-properties > summary').click();
  await expect(page.getByLabel('Linked project', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Linked project', { exact: true })).toHaveValue('followup-project');
});

test('Goal form recovery cannot unlink projects that were unavailable when the form opened', async ({ page, context }) => {
  await bugFixture(context);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const projectWrites: unknown[] = [];
  await context.route('**/api/v1/projects**', async route => {
    if (route.request().method() !== 'GET') projectWrites.push(route.request().postDataJSON());
    await pending;
    return route.fulfill({ json: [{ ...project, goalId: goal.id }] });
  });
  await context.route('**/api/v1/goals**', route => route.fulfill({ json: route.request().method() === 'PATCH' ? { ...goal, ...route.request().postDataJSON() } : [goal] }));
  try {
    await page.goto('/app/goals');
    await page.getByRole('button', { name: 'Options for Available goal', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Goal', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Edit Goal', exact: true });
    await expect(form).toContainText('Project links are unchanged');
    release();
    await expect(form.getByRole('checkbox', { name: 'Available project', exact: true })).toBeDisabled();
    await form.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(form).toHaveCount(0);
    expect(projectWrites).toEqual([]);
  } finally { release(); }
});

test('A fresh-day lookup failure cannot silently schedule a task using stale Inbox data', async ({ page, context }) => {
  await bugFixture(context);
  let failing = false;
  await context.route('**/api/v1/dashboard', route => route.fulfill({ status: failing ? 503 : 200, json: failing ? { message: 'Synthetic day lookup failure' } : { dateKey: '2026-10-17', stats: {}, today: { tasks: [] }, habits: [], projects: [], goals: [], activity: [] } }));
  let writes = 0;
  await context.route('**/api/v1/tasks/review-task', route => { writes++; return route.fulfill({ json: {} }); });
  await page.goto('/app/inbox');
  const schedule = page.getByRole('button', { name: 'Schedule today: Task to organise', exact: true });
  await expect(schedule).toBeEnabled();
  failing = true;
  await schedule.click();
  await expect(page.getByText('Synthetic day lookup failure', { exact: true })).toBeVisible();
  expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: 'Task to organise', exact: true })).toBeVisible();
});

test('Brain task shortcuts cannot open a second dialog behind global search', async ({ page, context }) => {
  await bugFixture(context);
  await page.goto('/app/brain?doc=review-document');
  await expect(page.getByRole('textbox', { name: 'Document body', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await expect(search).toBeVisible();
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(search).toBeVisible();
});

test('Daily planning refuses a stale-day write after an unrendered clock jump', async ({ page, context }) => {
  await bugFixture(context);
  let serverDay = '2026-10-17';
  const writes: string[] = [];
  await context.route('**/api/v1/dashboard', route => route.fulfill({ json: { dateKey: serverDay, stats: {}, today: { tasks: [] }, habits: [], projects: [], goals: [], activity: [] } }));
  await context.route('**/api/v1/dashboard/day-plan**', route => {
    if (route.request().method() === 'PUT') writes.push(route.request().url());
    return route.fulfill({ json: { taskIds: [], decisions: {}, revision: 0 } });
  });
  await page.clock.install({ time: new Date('2026-10-17T23:59:55+05:30') });
  await page.goto('/app/');
  const choice = page.getByLabel('0/3 priorities chosen', { exact: true });
  await expect(choice).toBeEnabled();
  serverDay = '2026-10-18';
  await page.clock.setSystemTime(new Date('2026-10-18T00:00:05+05:30'));
  await choice.selectOption('review-task');
  await expect(page.getByText('The day changed. Your dashboard is refreshing; choose again for today.', { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('An unused navigation prefix expires so the next project action is not swallowed', async ({ page, context }) => {
  await projectFixture(context);
  await page.clock.install();
  await page.goto('/app/projects/followup-project');
  await expect(page.getByRole('button', { name: 'Edit Project', exact: true })).toBeVisible();
  await page.keyboard.press('e');
  await page.clock.runFor(2100);
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog').getByRole('textbox').first()).toBeVisible();
});
