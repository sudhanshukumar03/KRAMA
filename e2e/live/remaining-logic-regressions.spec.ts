import { test, expect } from './fixtures';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const shift = (days: number) => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString(); };

test('an overdue deadline does not pull future scheduled work into today Focus', async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Scheduled three days from now', status: 'TODO', scheduledDate: shift(3), dueDate: shift(-1), estimateMinutes: 25 }, 201);
  const schedule = await account.call('GET', 'focus-sessions/schedule');
  expect(schedule.plan.some((slot: any) => slot.taskId === task.id)).toBe(false);
});

test('an individually restored task can be planned after its project was deleted', async ({ account }) => {
  const project = await account.call('POST', 'projects', { name: 'Deleted before task recovery' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Recover individual task', projectId: project.id }, 201);
  await account.call('DELETE', `tasks/${task.id}`);
  await account.call('DELETE', `projects/${project.id}`);
  await account.call('POST', `tasks/${task.id}/restore`);
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.deletedAt).toBeNull(); expect(saved.project).toBeNull(); expect(saved.projectId).toBeNull();
  await account.call('POST', 'planner/time-blocks', { title: 'Reserve restored task', taskId: task.id, type: 'WORK', date: shift(0), startTime: '09:00', endTime: '09:25' }, 201);
});

for (const offset of [-1, 0]) test(`unscheduled work with a deadline ${offset} days from today remains eligible`, async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Unscheduled deadline work', status: 'TODO', dueDate: shift(offset), estimateMinutes: 25 }, 201);
  expect((await account.call('GET', 'focus-sessions/schedule')).plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
});

test('an explicit current-day priority overrides a future work date but not its dependency', async ({ account }) => {
  const prerequisite = await account.call('POST', 'tasks', { title: 'Unfinished prerequisite', status: 'TODO' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Chosen for today', status: 'TODO', scheduledDate: shift(3), dueDate: shift(-1), estimateMinutes: 25 }, 201);
  await account.call('PUT', `dashboard/day-plan?date=${today()}`, { taskIds: [task.id], expectedRevision: 0 });
  expect((await account.call('GET', 'focus-sessions/schedule')).plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
  const saved = await account.call('GET', `tasks/${task.id}`);
  await account.call('PATCH', `tasks/${task.id}`, { blockedById: prerequisite.id, version: saved.version });
  expect((await account.call('GET', 'focus-sessions/schedule')).plan.some((slot: any) => slot.taskId === task.id)).toBe(false);
});

test('a current-day reservation overrides a later task work date', async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Reserved explicitly', status: 'TODO', scheduledDate: shift(3), dueDate: shift(-1), estimateMinutes: 25 }, 201);
  const block = await account.call('POST', 'planner/time-blocks', { title: task.title, taskId: task.id, type: 'WORK', date: shift(0), startTime: '09:00', endTime: '09:25' }, 201);
  const saved = await account.call('GET', `tasks/${task.id}`);
  await account.call('PATCH', `tasks/${task.id}`, { scheduledDate: shift(3), version: saved.version });
  const schedule = await account.call('GET', 'focus-sessions/schedule');
  expect(schedule.plan.some((slot: any) => slot.taskId === task.id && slot.timeBlockId === block.id)).toBe(true);
});

test('individual recovery preserves an active project association', async ({ account }) => {
  const project = await account.call('POST', 'projects', { name: 'Still active' }, 201);
  const task = await account.call('POST', 'tasks', { title: 'Keep my project', projectId: project.id }, 201);
  await account.call('DELETE', `tasks/${task.id}`);
  const restored = await account.call('POST', `tasks/${task.id}/restore`);
  expect(restored.projectId).toBe(project.id); expect(restored.project.id).toBe(project.id);
});

test('project Undo preserves independent task recovery and earlier task deletions', async ({ account }) => {
  const project = await account.call('POST', 'projects', { name: 'Mixed recovery history' }, 201);
  const independent = await account.call('POST', 'tasks', { title: 'Recover separately', projectId: project.id }, 201);
  const earlier = await account.call('POST', 'tasks', { title: 'Keep deleted', projectId: project.id }, 201);
  const included = await account.call('POST', 'tasks', { title: 'Recover with project', projectId: project.id }, 201);
  await account.call('DELETE', `tasks/${independent.id}`); await account.call('DELETE', `tasks/${earlier.id}`);
  await account.call('DELETE', `projects/${project.id}`);
  await account.call('POST', `tasks/${independent.id}/restore`);
  await account.call('POST', `projects/${project.id}/restore`);
  expect((await account.call('GET', `tasks/${independent.id}`)).projectId).toBeNull();
  expect((await account.call('GET', `tasks/${included.id}`)).projectId).toBe(project.id);
  await account.call('GET', `tasks/${earlier.id}`, undefined, 404);
});

test('simultaneous project deletion and individual restore cannot leave an active orphan', async ({ account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  for (let iteration = 0; iteration < 4; iteration++) {
    const project = await account.call('POST', 'projects', { name: `Concurrent recovery ${iteration}` }, 201);
    const task = await account.call('POST', 'tasks', { title: 'Recover while project is removed', projectId: project.id }, 201);
    await account.call('DELETE', `tasks/${task.id}`);
    await Promise.all([account.call('DELETE', `projects/${project.id}`), account.call('POST', `tasks/${task.id}/restore`)]);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: { project: true } });
    expect(Boolean(saved.deletedAt) || saved.projectId === null || Boolean(saved.project && !saved.project.deletedAt)).toBe(true);
  }
});
