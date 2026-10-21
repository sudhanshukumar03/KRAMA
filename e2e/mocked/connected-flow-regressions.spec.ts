import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(readFileSync(resolve('e2e/fixtures/connected-flow.json'), 'utf8'));
const day = '2026-10-15';
const baseTask = { id: 'parent', title: 'Epic planning', status: 'TODO', priority: 'MEDIUM', position: 1, version: 1, projectId: null, parentTaskId: null, childTasks: [], metadata: {} };
const childTask = { ...baseTask, id: 'child', title: 'Fix keyboard trap', parentTaskId: 'parent' };

async function mock(page: Page | BrowserContext, options: { tasks?: any[]; canceled?: any[]; documents?: any[]; habits?: any[]; projects?: any[]; week?: any } = {}) {
  let documents = options.documents || [];
  const deletedTrees = new Map<string, any[]>();
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'deep-flow-token' };
    else if (path === '/auth/me') data = { user: { id: 'flow-user', name: 'Deep Flow', memberships: [{ workspaceId: 'ws1', role: 'OWNER', workspace: { id: 'ws1', name: 'Deep flow' } }] } };
    else if (path === '/workspaces') data = [{ id: 'ws1', name: 'Deep flow' }];
    else if (path === '/tasks') data = url.searchParams.get('status') === 'CANCELED' ? options.canceled || [] : options.tasks || [];
    else if (path.startsWith('/tasks/')) data = options.tasks?.find(task => task.id === path.split('/')[2]);
    else if (path === '/planner/week') data = options.week || fixture.before;
    else if (path === '/planner/milestones') data = { milestones: [], goalDeadlines: [] };
    else if (path.endsWith('/holidays')) data = { holidays: [] };
    else if (path === '/habits') data = options.habits || [];
    else if (path === '/projects') data = options.projects || [];
    else if (path === '/spaces') data = [{ id: 'space1', name: 'Notes' }];
    else if (path === '/documents') data = { items: documents, nextCursor: null };
    else if (path.endsWith('/links')) data = { incoming: [], outgoing: [] };
    else if (path.startsWith('/documents/')) {
      const id = path.split('/')[2];
      if (route.request().method() === 'DELETE') {
        const subtree = new Set([id]);
        for (let size = -1; size !== subtree.size;) { size = subtree.size; for (const doc of documents) if (subtree.has(doc.parentId)) subtree.add(doc.id); }
        deletedTrees.set(id, documents.filter(doc => subtree.has(doc.id)));
        documents = documents.filter(doc => !subtree.has(doc.id)); data = { message: 'Deleted' };
      }
      else if (path.endsWith('/restore')) { documents.push(...deletedTrees.get(id) || []); deletedTrees.delete(id); data = documents.find(doc => doc.id === id); }
      else data = documents.find(doc => doc.id === id) || {};
    }
    return route.fulfill({ json: data });
  });
}

test('a task due this week remains visible when moving from day to week view', async ({ page }) => {
  await mock(page, { tasks: [fixture.dueTask] });
  await page.goto('/app/planner?mode=day&date=' + day);
  await expect(page.getByRole('button', { name: fixture.dueTask.title, exact: true })).toBeVisible();
  await page.goto('/app/planner?mode=plan&date=' + day);
  await expect(page.getByRole('heading', { name: 'Planner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: fixture.dueTask.title, exact: true })).toBeVisible();
});

test('month view preserves an October deadline when the task is scheduled in November', async ({ page }) => {
  const task = { ...fixture.dueTask, scheduledDate: '2026-11-02T12:00:00.000Z' };
  await mock(page, { tasks: [task] });
  await page.clock.install({ time: new Date(day + 'T12:00:00Z') });
  await page.goto('/app/planner?mode=calendar&date=' + day);
  await expect(page.getByRole('button', { name: 'Open schedule for Thursday, October 15', exact: true })).toContainText(task.title);
  const upcoming = page.getByRole('button', { name: 'Open day schedule for Submit proposal on October 15', exact: true });
  await expect(upcoming).toBeVisible(); await upcoming.click();
  await expect(page).toHaveURL(/mode=day/); await expect(page).toHaveURL(/date=2026-10-15/);
});

for (const entry of ['day', 'week', 'dashboard']) {
test(`${entry} starts due-today work in Focus on the selected date rather than its future scheduled day`, async ({ page, context }) => {
  await mock(context, { tasks: [fixture.dueTask] });
  if (entry === 'dashboard') {
    await context.route('**/api/v1/dashboard', route => route.fulfill({ json: { dateKey: day, stats: {}, today: { tasks: [fixture.dueTask], overdueTaskIds: [], focusMinutes: 0, focusSessions: [] }, habits: [], goals: [], projects: [], activity: [], focus: { sessions: [] }, features: {} } }));
  }
  await page.goto(entry === 'dashboard' ? '/app/' : '/app/planner?mode=' + (entry === 'week' ? 'plan' : 'day') + '&date=' + day);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: entry === 'dashboard' ? 'Start Focus' : fixture.dueTask.title, exact: true }).click();
  const focus = await popup;
  await expect(focus).toHaveURL('/focus?task=due-task&date=' + day);
  await expect(focus.getByRole('dialog', { name: 'Plan your focus time', exact: true })).toContainText(fixture.dueTask.title);
});
}

test('weekly task placements distinguish due and scheduled days without duplicating the task total', async ({ page }) => {
  const task = { ...fixture.dueTask, scheduledDate: '2026-10-13T12:00:00.000Z' };
  const week = { ...fixture.before, tasks: [task], days: fixture.before.days.map((row: any) => ({ ...row, tasks: ['2026-10-13', day].includes(row.dateKey) ? [task] : [] })) };
  await mock(page, { tasks: [task], week });
  await page.goto('/app/planner?mode=plan&date=' + day);
  await expect(page.getByRole('button', { name: task.title, exact: true })).toHaveCount(2);
  await expect(page.getByRole('button', { name: task.title, exact: true }).filter({ hasText: 'Due' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: task.title, exact: true }).filter({ hasText: 'Scheduled' })).toHaveCount(1);
  await expect(page.getByText('1 tasks', { exact: true })).toBeVisible();
});

test('Board search can find an open subtask when its parent does not match', async ({ page }) => {
  await mock(page, { tasks: [{ ...baseTask, childTasks: [childTask] }, childTask] });
  await page.goto('/app/board');
  await expect(page.getByText(baseTask.title, { exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search tasks', exact: true }).fill(childTask.title);
  await expect(page.getByText(childTask.title, { exact: true })).toBeVisible();
});

test('an archived parent cannot hide its still-open child from the Board', async ({ page }) => {
  await mock(page, { tasks: [childTask], canceled: [{ ...baseTask, status: 'CANCELED', childTasks: [childTask] }] });
  await page.goto('/app/board');
  await expect(page.getByRole('searchbox', { name: 'Search tasks', exact: true })).toBeVisible();
  await expect(page.getByText(childTask.title, { exact: true })).toBeVisible();
});

for (const filter of ['project', 'priority']) {
test(`Board ${filter} filtering retains a matching child whose parent does not match`, async ({ page }) => {
  const parent = { ...baseTask, projectId: 'p1', priority: 'LOW' };
  const child = { ...childTask, projectId: 'p2', priority: 'HIGH' };
  await mock(page, { tasks: [{ ...parent, childTasks: [child] }, child], projects: [{ id: 'p1', name: 'Parent project' }, { id: 'p2', name: 'Child project' }] });
  await page.goto('/app/board');
  await page.getByRole('combobox', { name: filter === 'project' ? 'Filter by project' : 'Filter by priority', exact: true }).selectOption(filter === 'project' ? 'p2' : 'HIGH');
  await expect(page.getByText(child.title, { exact: true })).toBeVisible();
  await expect(page.getByText(parent.title, { exact: true })).toHaveCount(0);
});
}

test('pinning a daily habit preserves its rest-day behavior in Planner', async ({ page }) => {
  await mock(page, { habits: [fixture.habit] });
  await page.clock.install({ time: new Date(day + 'T12:00:00Z') });
  await page.goto('/app/habits');
  await expect(page.getByTitle('Not scheduled today', { exact: true })).toBeDisabled();
  await page.goto('/app/planner?mode=plan&date=' + day);
  await expect(page.getByRole('button', { name: 'Mark Monday ritual complete on Oct 15', exact: true })).toBeDisabled();
});

test('old rest-day habit logs can be undone and then return to a disabled rest day', async ({ page }) => {
  const scenario = { week: fixture.after };
  await mock(page, scenario);
  let removed = false;
  await page.route('**/api/v1/habits/monday/log?*', route => {
    expect(route.request().method()).toBe('DELETE'); removed = true; scenario.week = fixture.before;
    return route.fulfill({ json: fixture.habit });
  });
  await page.goto('/app/planner?mode=plan&date=' + day);
  const undo = page.getByRole('button', { name: 'Mark Monday ritual incomplete on Oct 15', exact: true });
  await expect(undo).toBeEnabled(); await expect(undo).toHaveAttribute('title', /excluded from streaks/);
  await undo.click(); await expect.poll(() => removed).toBe(true);
  await expect(page.getByRole('button', { name: 'Mark Monday ritual complete on Oct 15', exact: true })).toBeDisabled();
});

test('weekly routines expose their weekly target and remain loggable on rest days of the old daily schedule', async ({ page }) => {
  const week = { ...fixture.before, routines: fixture.before.routines.map((routine: any) => ({ ...routine, cadence: 'weekly', weeklyTarget: 3 })), occurrences: fixture.before.occurrences.map((occ: any) => ({ ...occ, scheduled: true })) };
  await mock(page, { week });
  await page.goto('/app/planner?mode=plan&date=' + day);
  await expect(page.getByText('3 per week', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Monday ritual complete on Oct 15', exact: true })).toBeEnabled();
});

for (const survivor of [true, false]) {
test(`trashing a document tree selects ${survivor ? 'a surviving document' : 'an empty state'} and Undo restores it`, async ({ page }) => {
  const doc = { spaceId: 'space1', projectId: null, tags: [], statusBadges: [], createdAt: day + 'T00:00:00Z', updatedAt: day + 'T00:00:00Z', contentJson: { type: 'doc', content: [{ type: 'paragraph' }] } };
  await mock(page, { documents: [{ ...doc, id: 'root', title: 'Parent note', parentId: null }, { ...doc, id: 'nested', title: 'Child note', parentId: 'root' }, { ...doc, id: 'deep', title: 'Grandchild note', parentId: 'nested' }, ...(survivor ? [{ ...doc, id: 'survivor', title: 'Surviving note', parentId: null }] : [])] });
  await page.goto('/app/brain?doc=root');
  await page.getByRole('button', { name: 'More document actions', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Move to Trash', exact: true }).click();
  await expect(page.getByText('Moved "Parent note" to Trash', { exact: true })).toBeVisible();
  if (survivor) await expect(page).toHaveURL(/doc=survivor/);
  else { await expect(page).not.toHaveURL(/doc=/); await expect(page.getByText('No Specification Selected', { exact: true })).toBeVisible(); }
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page).toHaveURL(/doc=root/);
  await expect(page.getByRole('textbox', { name: 'Document title', exact: true })).toHaveValue('Parent note');
});
}
