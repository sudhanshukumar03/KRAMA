import { test, expect } from './fixtures';
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const tomorrow = () => { const date = new Date(`${day()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); };
const blockDraft = () => ({ title: 'Explicitly planned work', type: 'WORK', date: `${day()}T12:00:00Z`, startTime: '09:00', endTime: '09:25' });

test('block creation activates linked backlog work without a separate task request', async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Backlog block selection', status: 'BACKLOG', metadata: { inbox: true, source: 'note' } }, 201);
  await account.call('POST', 'planner/time-blocks', { ...blockDraft(), taskId: task.id }, 201);
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.status).toBe('TODO'); expect(saved.metadata.inbox).toBe(false); expect(saved.metadata.source).toBe('note');
  expect(saved.scheduledDate.slice(0, 10)).toBe(day());
  expect((await account.call('GET', 'focus-sessions/schedule')).plan.some((slot: any) => slot.taskId === task.id)).toBe(true);
});

test('relinking and moving a block update its task plan in the same operation', async ({ account }) => {
  const first = await account.call('POST', 'tasks', { title: 'Original linked task', status: 'TODO' }, 201);
  const second = await account.call('POST', 'tasks', { title: 'New linked task', status: 'BACKLOG', metadata: { inbox: true } }, 201);
  const block = await account.call('POST', 'planner/time-blocks', { ...blockDraft(), taskId: first.id }, 201);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { taskId: second.id });
  let saved = await account.call('GET', `tasks/${second.id}`);
  expect(saved.status).toBe('TODO'); expect(saved.scheduledDate.slice(0, 10)).toBe(day());
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { date: `${tomorrow()}T12:00:00Z` });
  saved = await account.call('GET', `tasks/${second.id}`);
  expect(saved.scheduledDate.slice(0, 10)).toBe(tomorrow());
  // Editing notes on a previously deferred reservation must not reactivate it.
  await account.call('PATCH', `tasks/${second.id}`, { status: 'BACKLOG', scheduledDate: null, version: saved.version });
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { taskId: second.id, notes: 'Keep this reservation for reference' });
  expect((await account.call('GET', `tasks/${second.id}`)).status).toBe('BACKLOG');
});

test('reserving an already planned task preserves its version for a subsequent edit', async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: 'Already planned work', status: 'TODO', scheduledDate: `${day()}T12:00:00Z` }, 201);
  await account.call('POST', 'planner/time-blocks', { ...blockDraft(), taskId: task.id }, 201);
  expect((await account.call('GET', `tasks/${task.id}`)).version).toBe(task.version);
  const saved = await account.call('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version });
  expect(saved.status).toBe('DONE');
});

test('a conflicting reservation does not change the linked task', async ({ account }) => {
  const block = await account.call('POST', 'planner/time-blocks', blockDraft(), 201);
  const task = await account.call('POST', 'tasks', { title: 'Failed reservation candidate', status: 'BACKLOG', metadata: { inbox: true } }, 201);
  await account.call('POST', 'planner/time-blocks', { ...blockDraft(), taskId: task.id }, 409);
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.status).toBe('BACKLOG'); expect(saved.scheduledDate).toBeNull(); expect(saved.version).toBe(task.version);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { taskId: task.id });
  const planned = await account.call('GET', `tasks/${task.id}`);
  await account.call('POST', 'planner/time-blocks', { ...blockDraft(), date: `${tomorrow()}T12:00:00Z` }, 201);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { date: `${tomorrow()}T12:00:00Z` }, 409);
  const unchanged = await account.call('GET', `tasks/${task.id}`);
  expect(unchanged.scheduledDate).toBe(planned.scheduledDate); expect(unchanged.version).toBe(planned.version);
});

for (const status of ['DONE', 'CANCELED']) test(`block changes preserve ${status} tasks`, async ({ account }) => {
  const task = await account.call('POST', 'tasks', { title: `${status} task`, status }, 201);
  const block = await account.call('POST', 'planner/time-blocks', { ...blockDraft(), taskId: task.id }, 201);
  await account.call('PATCH', `planner/time-blocks/${block.id}`, { date: `${tomorrow()}T12:00:00Z` });
  const saved = await account.call('GET', `tasks/${task.id}`);
  expect(saved.status).toBe(status); expect(saved.scheduledDate).toBeNull(); expect(saved.version).toBe(task.version);
});

test('timezone synchronization repairs malformed legacy metadata into an object', async ({ request, account }) => {
  const { prisma } = await import('../../apps/server/src/prisma');
  await prisma.user.update({ where: { id: account.userId }, data: { metadata: [] } });
  const login = await request.post('/api/v1/auth/login', { data: { email: account.email, password: account.password } });
  const { accessToken } = await login.json();
  const response = await request.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${accessToken}`, 'x-timezone': 'Pacific/Kiritimati' } });
  expect(response.status()).toBe(200);
  const { user } = await response.json();
  expect(Array.isArray(user.metadata)).toBe(false); expect(user.metadata.timezone).toBe('Pacific/Kiritimati');
});

test('changing a Goals search reveals matches after collapsing an earlier search', async ({ page, account }) => {
  const root = await account.call('POST', 'goals', { title: 'Search reveal root', type: 'OBJECTIVE' }, 201);
  const child = await account.call('POST', 'goals', { title: 'Read the first book', type: 'OBJECTIVE', parentGoalId: root.id }, 201);
  await account.signIn(page); await page.goto('/app/goals');
  const search = page.getByRole('searchbox', { name: 'Search goals', exact: true });
  await search.fill('first book');
  await expect(page.getByRole('button', { name: child.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Collapse key results for ${root.title}`, exact: true }).click();
  await expect(page.getByRole('button', { name: child.title, exact: true })).toHaveCount(0);
  await search.fill('Read the first');
  await expect(page.getByRole('button', { name: child.title, exact: true })).toBeVisible();
});
