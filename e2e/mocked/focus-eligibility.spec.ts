import { expect, test, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backup = JSON.parse(readFileSync(resolve('e2e/fixtures/personal-backup.json'), 'utf8'));
const day = '2026-10-15';

async function setup(context: BrowserContext) {
  const tasks: any[] = structuredClone(backup.workspace.tasks);
  const task = tasks[0];
  const blocker = tasks[1];
  task.status = 'TODO'; task.scheduledDate = day + 'T12:00:00.000Z';
  blocker.status = 'TODO'; blocker.deletedAt = null;
  const plan: any = { taskIds: [task.id], decisions: {}, revision: 1, reviewedAt: null };
  const withRelations = (item: any) => ({ ...item, blockedBy: item.blockedById === blocker.id ? { ...blocker } : null, comments: [] });
  await context.route('**/socket.io/**', route => route.abort());
  await context.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    const payload = ['PUT', 'PATCH', 'POST'].includes(method) ? route.request().postDataJSON() : null;
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'focus-eligibility-test-token' };
    else if (path === '/auth/me') data = { user: { ...backup.workspace.members[0].user, metadata: {}, memberships: [{ workspaceId: backup.workspace.id, role: 'OWNER', workspace: { id: backup.workspace.id, name: 'Personal' } }] } };
    else if (path === '/workspaces') data = [backup.workspace];
    else if (path === '/projects') data = backup.workspace.projects;
    else if (path === '/dashboard/day-plan') {
      if (payload?.review) {
        const { taskId, action } = payload.review;
        const changed = tasks.find(item => item.id === taskId);
        changed.status = action === 'backlog' ? 'BACKLOG' : action === 'cancel' ? 'CANCELED' : 'TODO';
        changed.scheduledDate = action === 'tomorrow' ? '2026-10-16T12:00:00.000Z' : null;
        changed.version++;
        plan.taskIds = plan.taskIds.filter((id: string) => id !== taskId);
        plan.decisions[taskId] = { action, at: day + 'T10:00:00Z' }; plan.revision++;
      }
      data = plan;
    }
    else if (path === '/dashboard') data = { dateKey: day, stats: { totalTasks: tasks.length }, today: { tasks: tasks.filter(item => !['CANCELED'].includes(item.status) && (item.scheduledDate?.slice(0, 10) <= day || item.dueDate?.slice(0, 10) <= day)).map(withRelations), overdueTaskIds: [], focusMinutes: 0 }, habits: [], projects: [], goals: [], activity: [], focus: { sessions: [] }, features: {} };
    else if (path === '/tasks') data = tasks.filter(item => url.searchParams.get('status') === 'CANCELED' ? item.status === 'CANCELED' : item.status !== 'CANCELED').map(withRelations);
    else if (path.startsWith('/tasks/')) {
      const selected = tasks.find(item => item.id === path.split('/')[2]);
      if (method === 'PATCH' && selected) {
        const replanned = (payload.scheduledDate !== undefined && payload.scheduledDate !== selected.scheduledDate) || (payload.status && payload.status !== selected.status && !['BACKLOG', 'CANCELED', 'DONE'].includes(payload.status));
        Object.assign(selected, payload, { version: selected.version + 1 });
        if (replanned && plan.decisions[selected.id]) { delete plan.decisions[selected.id]; plan.revision++; }
      }
      data = selected ? withRelations(selected) : {};
    }
    else if (path === '/planner/week') data = { timeBlocks: [], tasks, habits: [], milestones: [], dateRange: { start: day, end: day } };
    else if (path === '/focus-sessions/schedule') data = { mode: 'empty', plan: [], remainingMinutes: 480, dailyCapMinutes: 480, totalFocusMinutes: 0, taskBreakdown: [] };
    return route.fulfill({ json: data });
  });
  return { task, blocker, plan };
}

test('Focus explains an unfinished prerequisite and prevents setup through the direct task route', async ({ page, context }) => {
  const { task, blocker } = await setup(context);
  await page.goto('/app/');
  await expect(page.getByRole('button', { name: `Start Focus for ${task.title}`, exact: true })).toBeDisabled();
  await page.goto(`/focus?task=${task.id}&date=${day}`);
  await expect(page.getByRole('status').filter({ hasText: `Waiting for ${blocker.title}` })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /pause/i })).toHaveCount(0);
  blocker.status = 'DONE';
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toBeVisible();
});

for (const prerequisite of ['DONE', 'CANCELED', 'deleted'] as const) {
  test(`Focus allows work after the prerequisite is ${prerequisite}`, async ({ page, context }) => {
    const { task, blocker } = await setup(context);
    if (prerequisite === 'deleted') blocker.deletedAt = day + 'T10:00:00Z';
    else blocker.status = prerequisite;
    await page.goto(`/focus?task=${task.id}&date=${day}`);
    const dialog = page.getByRole('dialog', { name: 'Plan your focus time' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Use this plan' })).toBeEnabled();
  });
}

test('a reviewed task returns to Dashboard after replanning it in Tasks', async ({ page, context }) => {
  const { task, blocker, plan } = await setup(context);
  blocker.status = 'DONE';
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Review unfinished work' }).click();
  await page.getByRole('button', { name: `Return to backlog: ${task.title}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Open task ${task.title}`, exact: true })).toHaveCount(0);
  await page.goto(`/app/board?task=${task.id}`);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Scheduled date', { exact: true }).fill(day);
  await dialog.getByLabel('Column / Status', { exact: true }).selectOption('TODO');
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(plan.decisions[task.id]).toBeUndefined();
  await page.getByRole('link', { name: /^Dashboard/ }).click();
  await expect(page.getByRole('button', { name: `Open task ${task.title}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review unfinished work' }).click();
  await expect(page.getByRole('button', { name: `Do tomorrow: ${task.title}`, exact: true })).toBeVisible();
});
