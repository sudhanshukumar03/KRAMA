import { test, expect } from './fixtures';
const body = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

// Regression checks for the confirmed personal-workspace defects. Use isolated services only.
test('D01 Brain saves new writing around historical deleted references', async ({ account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Deleted reference' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Referenced task' }, 201);
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original task reference', marks: [{ type: 'link', attrs: { href: '#', 'data-entity-type': 'TASK', 'data-entity-id': task.id } }] }] }] };
  const doc = await account.call('POST', 'documents', { spaceId: space.id, title: 'Ongoing note', contentJson: content }, 201);
  await account.call('DELETE', `tasks/${task.id}`);
  const result = await account.call('PATCH', `documents/${doc.id}/content`, { expectedUpdatedAt: doc.updatedAt, contentJson: { ...content, content: [...content.content, ...body('New paragraph that should save.').content] } });
  expect(result.updatedAt).toBeTruthy();
  expect((await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('New paragraph');
  await account.call('POST', 'documents', { spaceId: space.id, title: 'New invalid reference', contentJson: content }, 400);
});

test('D02 restoring a note from a deleted space makes it reachable', async ({ account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Space removed before restore' }, 201);
  const doc = await account.call('POST', 'documents', { spaceId: space.id, title: 'Restore me', contentJson: body('Keep this note') }, 201);
  const child = await account.call('POST', 'documents', { spaceId: space.id, parentId: doc.id, title: 'Restored child', contentJson: body('Keep this child') }, 201);
  const earlier = await account.call('POST', 'documents', { spaceId: space.id, title: 'Previously deleted note' }, 201);
  await account.call('DELETE', `documents/${earlier.id}`);
  await account.call('DELETE', `spaces/${space.id}`);
  expect((await account.call('GET', 'documents?deleted=true')).items.some((item: any) => item.id === doc.id)).toBe(true);
  await account.call('POST', `documents/${doc.id}/restore`);
  expect((await account.call('GET', 'documents')).items.some((item: any) => item.id === doc.id)).toBe(true);
  expect((await account.call('GET', 'documents?deleted=true')).items.some((item: any) => item.id === doc.id)).toBe(false);
  const restored = await account.call('GET', `documents/${doc.id}`);
  const restoredChild = await account.call('GET', `documents/${child.id}`);
  expect(restoredChild.spaceId).toBe(restored.spaceId);
  expect(restoredChild.parentId).toBe(doc.id);
  expect((await account.call('GET', 'spaces')).some((space: any) => space.id === restored.spaceId)).toBe(true);
  expect((await account.call('GET', 'documents?deleted=true')).items.some((item: any) => item.id === earlier.id)).toBe(true);
});

test('D03 a surviving note creates an unassigned task after project deletion', async ({ account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Project notes' }, 201);
  const project = await account.call('POST', 'projects', { name: 'Deleted project' }, 201);
  const doc = await account.call('POST', 'documents', { spaceId: space.id, projectId: project.id, title: 'Useful project note', contentJson: body('A new next step') }, 201);
  await account.call('DELETE', `projects/${project.id}`);
  expect((await account.call('GET', `documents/${doc.id}`)).projectId).toBe(project.id);
  const result = await account.call('POST', `documents/${doc.id}/tasks`, { title: 'Next step from note' }, 201);
  expect(result.task.projectId).toBeNull();
});

test('D04 Planner rejects conflicting project links and Focus uses the task project', async ({ account }) => {
  const projectA = await account.call('POST', 'projects', { name: 'Actual project' }, 201);
  const projectB = await account.call('POST', 'projects', { name: 'Wrong attribution' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Task in actual project', projectId: projectA.id, scheduledDate: `${today()}T12:00:00.000Z` }, 201);
  const draft = { title: task.title, date: `${today()}T12:00:00.000Z`, startTime: '09:00', endTime: '09:25', type: 'WORK', taskId: task.id };
  await account.call('POST', 'planner/time-blocks', { ...draft, projectId: projectB.id }, 400);
  const block = await account.call('POST', 'planner/time-blocks', { ...draft, projectId: projectA.id }, 201);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { projectId: projectB.id }, 400);
  const otherTask = await account.call('POST', 'tasks', { title: 'Another project task', projectId: projectB.id }, 201);
  const relinked = await account.call('PATCH', `planner/time-blocks/${block.id}`, { taskId: otherTask.id });
  expect(relinked.projectId).toBe(projectB.id);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { taskId: task.id, projectId: projectA.id });
  const { prisma } = await import('../../apps/server/src/prisma');
  await prisma.timeBlock.update({ where: { id: block.id }, data: { projectId: projectB.id } });
  const schedule = await account.call('GET', 'focus-sessions/schedule');
  expect(schedule.plan.find((slot: any) => slot.taskId === task.id)?.projectId).toBe(projectA.id);
});

test('D05 Move to backlog defers the task while retaining its deadline', async ({ page, account }) => {
  const date = today();
  const task = await account.call('POST', 'tasks', { title: 'Return this deadline task to backlog', scheduledDate: `${date}T12:00:00.000Z`, dueDate: `${date}T12:00:00.000Z`, status: 'TODO' }, 201);
  await account.signIn(page); await page.goto(`/app/planner?mode=day&date=${date}`);
  await page.getByTitle('Move to backlog', { exact: true }).first().click();
  await expect.poll(async () => (await account.call('GET', `tasks/${task.id}`)).scheduledDate).toBeNull();
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.status).toBe('BACKLOG'); expect(saved.dueDate).not.toBeNull();
  await expect(page.getByText(task.title, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Backlog/ }).click();
  await expect(page.getByText(task.title, { exact: true })).toBeVisible();
});

test('D06 Brain graph excludes deleted destinations', async ({ account }) => {
  const space = await account.call('POST', 'spaces', { name: 'Graph reference' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Deleted graph task' }, 201);
  const doc = await account.call('POST', 'documents', { spaceId: space.id, title: 'Graph root', contentJson: body('A note') }, 201);
  await account.call('POST', `documents/${doc.id}/links`, { targetType: 'TASK', targetId: task.id, linkType: 'REFERENCE' }, 201);
  await account.call('DELETE', `tasks/${task.id}`);
  const graph = await account.call('GET', `workspaces/${account.workspaceId}/graph`);
  expect(graph.nodes.some((node: any) => node.id === task.id)).toBe(false);
  expect(graph.links.some((link: any) => link.targetId === task.id)).toBe(false);
});

test('D07 scheduling backlog work activates it for Focus and clears Inbox', async ({ page, account }) => {
  const date = today();
  const task = await account.call('POST', 'tasks', { title: 'Deferred task chosen for today', status: 'BACKLOG', metadata: { inbox: true } }, 201);
  await account.signIn(page); await page.goto(`/app/planner?mode=day&date=${date}`);
  await page.getByRole('button', { name: /^Backlog/ }).click();
  await page.getByRole('button', { name: '+ Today', exact: true }).click();
  await expect.poll(async () => (await account.call('GET', `tasks/${task.id}`)).scheduledDate).not.toBeNull();
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.status).toBe('TODO'); expect(saved.metadata.inbox).toBe(false);
  const schedule = await account.call('GET', 'focus-sessions/schedule');
  expect(schedule.plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
});

test('D08 browser today is eligible and its timezone is saved for background streaks', async ({ browser, account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  await account.call('PATCH', 'auth/me/preferences', { locationConfig: { countryCode: 'US' } });
  const utcDay = new Date().toISOString().slice(0, 10);
  const zone = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'].find(zone => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date()) !== utcDay)!;
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date());
  const habit = await account.call('POST', 'habits', { name: 'Local day habit', cadence: 'daily' }, 201);
  const context = await browser.newContext({ timezoneId: zone });
  try {
    const page = await context.newPage();
    await account.signIn(page); await page.goto('/app/habits');
    const response = page.waitForResponse(response => response.url().endsWith(`/habits/${habit.id}/log`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Complete for today: Local day habit', exact: true }).click();
    const reply = await response;
    expect(reply.status()).toBe(200);
    expect(await page.evaluate(() => new Intl.DateTimeFormat('en-CA').format(new Date()))).toBe(localDay);
  } finally { await context.close(); }
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: account.userId } });
  expect((profile.metadata as any).timezone).toBe(zone);
  expect((await account.call('GET', `habits/${habit.id}`)).completions[0].date.slice(0, 10)).toBe(localDay);
});

test('D09 space deletion cleans imported goal links and cached lists', async ({ account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const space = await account.call('POST', 'spaces', { name: 'Imported project space' }, 201);
  const goal = await account.call('POST', 'goals', { title: 'Imported goal', type: 'OBJECTIVE' }, 201);
  // spaceId is accepted by workspace backup restore, but not the normal form.
  await prisma.goal.update({ where: { id: goal.id }, data: { spaceId: space.id } });
  const habit = await account.call('POST', 'habits', { name: 'Habit with imported goal', linkedGoalId: goal.id }, 201);
  await account.call('GET', 'goals'); // Populate the server's list cache.
  await account.call('DELETE', `spaces/${space.id}`);
  const latest = await account.call('GET', `habits/${habit.id}`);
  expect(latest.linkedGoalId).toBeNull();
  await account.call('PATCH', `habits/${habit.id}`, { name: 'Renamed habit', version: latest.version });
  expect((await account.call('GET', 'goals')).some((item: any) => item.id === goal.id)).toBe(false);
});

test('D10 Planner task deletion can be undone', async ({ page, account }) => {
  const date = today();
  const task = await account.call('POST', 'tasks', { title: 'Planner deletion recovery', scheduledDate: `${date}T12:00:00.000Z` }, 201);
  await account.signIn(page); await page.goto(`/app/planner?mode=day&date=${date}`);
  await page.getByTitle('Delete task', { exact: true }).click();
  await expect(page.getByText('Task deleted', { exact: true })).toBeVisible();
  await account.call('GET', `tasks/${task.id}`, undefined, 404);
  const restored = page.waitForResponse(response => response.url().endsWith(`/tasks/${task.id}/restore`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await restored).status()).toBe(200);
  expect((await account.call('GET', `tasks/${task.id}`)).deletedAt).toBeNull();
  await expect(page.getByText(task.title, { exact: true })).toBeVisible();
});

test('D11 nested goals remain visible beyond the third level', async ({ page, account }) => {
  const root = await account.call('POST', 'goals', { title: 'Audit hierarchy root', type: 'OBJECTIVE' }, 201);
  const second = await account.call('POST', 'goals', { title: 'Audit hierarchy second', type: 'OBJECTIVE', parentGoalId: root.id }, 201);
  const third = await account.call('POST', 'goals', { title: 'Audit hierarchy third', type: 'OBJECTIVE', parentGoalId: second.id }, 201);
  await account.signIn(page); await page.goto(`/app/goals?goal=${third.id}`);
  await expect(page.getByRole('button', { name: 'Add Key Result', exact: true })).toBeVisible();
  const fourth = await account.call('POST', 'goals', { title: 'Audit hierarchy fourth', type: 'OBJECTIVE', parentGoalId: third.id }, 201);
  const goals = await account.call('GET', 'goals');
  expect(goals.some((goal: any) => goal.id === fourth.id)).toBe(true);
  expect(JSON.stringify(goals.find((goal: any) => goal.id === root.id))).toContain(fourth.id);
  await page.goto('/app/goals');
  await expect(page.getByRole('button', { name: fourth.title, exact: true })).toBeVisible();
});

test('D12 Planner returns validation errors for forbidden habit history', async ({ account }) => {
  const habit = await account.call('POST', 'habits', { name: 'New routine date validation', cadence: 'daily', pinnedToPlanner: true }, 201);
  const yesterday = new Date(`${today()}T12:00:00.000Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await account.call('PATCH', 'planner/routine-occurrences', { id: `${habit.id}-${yesterday.toISOString().slice(0, 10)}`, habitId: habit.id, date: yesterday.toISOString(), completed: true }, 400);
  expect((await account.call('GET', `habits/${habit.id}`)).completions).toHaveLength(0);
});

test('D13 Goals search finds and reveals matching descendants', async ({ page, account }) => {
  const root = await account.call('POST', 'goals', { title: 'Language learning', type: 'OBJECTIVE' }, 201);
  const second = await account.call('POST', 'goals', { title: 'Spanish course', type: 'OBJECTIVE', parentGoalId: root.id }, 201);
  const third = await account.call('POST', 'goals', { title: 'Finish the B1 workbook', type: 'OBJECTIVE', parentGoalId: second.id }, 201);
  await account.signIn(page); await page.goto('/app/goals');
  await expect(page.getByRole('button', { name: root.title, exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search goals', exact: true }).fill(third.title);
  await expect(page.getByRole('button', { name: root.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: third.title, exact: true })).toBeVisible();
});

test('date-only scheduling by an older client activates backlog work on the server', async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Legacy client planned work', status: 'BACKLOG', metadata: { inbox: true, source: 'note' } }, 201);
  const saved = await account.call('PATCH', `tasks/${task.id}`, { scheduledDate: `${today()}T12:00:00.000Z`, version: task.version });
  expect(saved.status).toBe('TODO'); expect(saved.metadata.inbox).toBe(false); expect(saved.metadata.source).toBe('note');
  expect((await account.call('GET', 'focus-sessions/schedule')).plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
});

test('invalid timezone input is rejected without writing a habit checkoff', async ({ request, account }) => {
  const habit = await account.call('POST', 'habits', { name: 'Invalid timezone guard', cadence: 'daily' }, 201);
  const login = await request.post('/api/v1/auth/login', { data: { email: account.email, password: account.password } });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}`, 'x-workspace-id': account.workspaceId, 'x-timezone': 'invalid/zone' };
  const response = await request.post(`/api/v1/habits/${habit.id}/log`, { headers, data: { date: today() } });
  expect(response.status()).toBe(400);
  expect((await request.get('/api/v1/auth/me', { headers })).status()).toBe(400);
  expect((await account.call('GET', `habits/${habit.id}`)).completions).toHaveLength(0);
});

test('previously stranded active notes in deleted spaces are discoverable and recoverable', async ({ account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  const space = await account.call('POST', 'spaces', { name: 'Legacy orphan recovery' }, 201);
  const root = await account.call('POST', 'documents', { spaceId: space.id, title: 'Previously stranded root' }, 201);
  const child = await account.call('POST', 'documents', { spaceId: space.id, parentId: root.id, title: 'Previously stranded child' }, 201);
  await account.call('DELETE', `spaces/${space.id}`);
  // Reproduce the state written by the old restore implementation.
  await prisma.document.updateMany({ where: { id: { in: [root.id, child.id] } }, data: { deletedAt: null } });
  expect((await account.call('GET', 'documents')).items.some((doc: any) => doc.id === root.id)).toBe(false);
  expect((await account.call('GET', 'documents?deleted=true')).items.some((doc: any) => doc.id === root.id)).toBe(true);
  await account.call('POST', `documents/${root.id}/restore`);
  const active = (await account.call('GET', 'documents')).items;
  expect(active.some((doc: any) => doc.id === root.id)).toBe(true);
  expect(active.some((doc: any) => doc.id === child.id)).toBe(true);
  const restoredChild = await account.call('GET', `documents/${child.id}`);
  expect(restoredChild.parentId).toBe(root.id);
  expect(restoredChild.spaceId).not.toBe(space.id);
});
