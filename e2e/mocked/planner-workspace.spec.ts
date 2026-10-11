import { expect, test, type Page } from '@playwright/test';

const day = '2025-10-15';
const task = { id: 't1', title: 'Release checklist', status: 'TODO', scheduledDate: `${day}T12:00:00.000Z` };
const block = { id: 'b1', title: 'Deep work', date: `${day}T12:00:00.000Z`, startTime: `${day}T09:00:00.000Z`, endTime: `${day}T10:00:00.000Z`, type: 'WORK' };
const milestone = { id: 'm1', title: 'Launch milestone', date: `${day}T12:00:00.000Z`, projectId: 'p1', completed: false };
const planner = { tasks: [task], timeBlocks: [block], milestones: [milestone], routines: [], occurrences: [], days: [], projects: [{ id: 'p1', name: 'Launch' }], goalDeadlines: [], capacity: { weeklyCapacityMinutes: 2430, occupiedMinutes: 60, meetingMinutes: 0, otherMinutes: 60, freeMinutes: 2370 }, config: { countryCode: 'IN' } };
async function mock(page: Page) {
  await page.route('**/socket.io/**', r => r.abort());
  await page.route('**/api/v1/**', r => {
    const path = new URL(r.request().url()).pathname.replace('/api/v1', '');
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'mock-token' };
    else if (path === '/auth/me') data = { user: { id: 'u1', name: 'Tester', memberships: [{ workspaceId: 'ws1', role: 'OWNER', workspace: { id: 'ws1', name: 'Test' } }] } };
    else if (path === '/workspaces') data = [{ id: 'ws1', name: 'Test' }];
    else if (path === '/planner/week') data = planner;
    else if (path === '/planner/milestones') data = { milestones: [milestone], goalDeadlines: [] };
    else if (path === '/holidays') data = { holidays: [] };
    else if (path === '/tasks') data = [task];
    return r.fulfill({ json: data });
  });
}
test('week and month navigation survives reload and browser history', async ({ page }) => {
  await mock(page); await page.goto(`/app/planner?mode=plan&date=${day}`);
  await expect(page.getByText('Oct 13 - Oct 19, 2025', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/date=2025-10-22/);
  await page.reload(); await expect(page.getByText('Oct 20 - Oct 26, 2025', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'MONTH', exact: true }).click();
  await expect(page.getByText('October 2025', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('November 2025', { exact: true })).toBeVisible();
  await page.goBack(); await expect(page.getByText('October 2025', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'SCHEDULE', exact: true }).click();
  await expect(page).toHaveURL(/date=2025-10-22/);
});
test('invalid URL dates recover without crashing', async ({ page }) => {
  await mock(page); await page.goto('/app/planner?mode=day&date=broken-date');
  await expect(page.getByRole('heading', { name: 'Planner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Time Block', exact: true })).toBeVisible();
});
test('calendar day keys stay on the same day in UTC+14', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Pacific/Kiritimati' });
  const page = await context.newPage(); await mock(page); await page.goto(`/app/planner?mode=day&date=${day}`);
  await expect(page.getByRole('button', { name: 'Release checklist', exact: true })).toBeVisible();
  await expect(page.getByText('Deep work', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch milestone', exact: true })).toBeVisible();
  await context.close();
});
test('time-block form is labelled, validates times and scrolls on a small screen', async ({ page }) => {
  await mock(page); await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/app/planner?mode=day&date=${day}`);
  await page.getByRole('button', { name: '+ Time Block', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Time Block' });
  await dialog.getByLabel('Time block title').fill('New work');
  await dialog.getByLabel('Date', { exact: true }).fill(day);
  await dialog.getByLabel('Start time').fill('11:00');
  await dialog.getByLabel('End time').fill('10:00');
  await dialog.getByRole('button', { name: 'Create Time Block' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('End time must be after start time');
  expect(await dialog.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: 'test-results/planner-mobile-dialog.png' });
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
});
test('capacity preserves fractional hours and blocks out-of-range values', async ({ page }) => {
  await mock(page); await page.goto(`/app/planner?date=${day}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Hours per Week')).toHaveValue('40.5');
  await page.getByLabel('Hours per Week').fill('169');
  await expect(page.getByRole('button', { name: 'Save Capacity' })).toBeDisabled();
});
test('keyboard milestone completion does not open the parent day', async ({ page }) => {
  await mock(page); await page.goto(`/app/planner?mode=calendar&date=${day}`);
  const toggle = page.getByRole('button', { name: 'Mark milestone complete', exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/mode=calendar/);
});
test('failed task loading exposes a working retry', async ({ page }) => {
  await mock(page);
  let fail = true;
  await page.route('**/api/v1/tasks*', r => r.fulfill(fail ? { status: 500, json: { message: 'Temporary failure' } } : { json: [task] }));
  await page.goto(`/app/planner?date=${day}`);
  const retry = page.getByRole('button', { name: 'Retry tasks', exact: true });
  await expect(retry).toBeVisible({ timeout: 15000 });
  fail = false; await retry.click(); await expect(retry).toBeHidden();
});

test('missing regional dates are disclosed in the calendar and capacity views', async ({ page }) => {
  await mock(page);
  const coverage = { missingNationalYears: [], missingRegionalYears: [2025] };
  await page.route('**/api/v1/planner/week*', r => r.fulfill({ json: { ...planner, holidayCoverage: coverage, config: { countryCode: 'IN', regionCode: 'KA' } } }));
  await page.route('**/api/v1/planner/holidays*', r => r.fulfill({ json: { holidays: [], coverage } }));
  await page.goto(`/app/planner?mode=plan&date=${day}`);
  await expect(page.getByText('Holiday coverage is incomplete. Available capacity may exclude missing holidays.')).toBeVisible();
  await page.getByRole('button', { name: 'MONTH', exact: true }).click();
  await expect(page.getByText('State holiday dates are unavailable for this period. Showing national dates only.')).toBeVisible();
});


test('day-view task completion preserves its version and linked time-block draft', async ({ page }) => {
  await mock(page);
  const versioned = { ...task, version: 7, projectId: 'p1', completed: false };
  await page.route('**/api/v1/tasks', route => route.fulfill({ json: [versioned] }));
  let patch: Record<string, unknown> | undefined;
  await page.route('**/api/v1/tasks/t1', route => {
    patch = route.request().postDataJSON();
    return route.fulfill({ json: { ...versioned, ...patch, version: 8 } });
  });
  await page.goto('/app/planner?mode=day&date=' + day);
  await page.getByRole('button', { name: 'Mark task complete', exact: true }).click();
  await expect.poll(() => patch).toMatchObject({ status: 'DONE', version: 7 });
  await page.getByRole('button', { name: 'Time Block', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Time block title', { exact: true })).toHaveValue(task.title);
  await expect(dialog.getByLabel('Task', { exact: true })).toHaveValue(task.id);
});

const secondTask = { ...task, id: "t2", title: "Review release notes", version: 3, estimateMinutes: 30 };
const secondBlock = { ...block, id: "b3", taskId: secondTask.id, title: secondTask.title, startTime: day + "T18:00:00.000Z", endTime: day + "T18:30:00.000Z" };

async function scheduledFocusMock(page: Page, minutes = 60, includeSecondTask = false) {
  await mock(page);
  const storedTask = { ...task, version: 7, estimateMinutes: minutes, projectId: 'p1', project: { id: 'p1', name: 'Launch' } };
  let storedBlock = { ...block, taskId: task.id, endTime: new Date(new Date(block.startTime).getTime() + minutes * 60000).toISOString() };
  let nextBlock = { ...block, id: 'b2', title: 'Next scheduled task', startTime: storedBlock.endTime, endTime: new Date(new Date(storedBlock.endTime).getTime() + 3600000).toISOString() };
  const state = { completions: [] as Record<string, unknown>[], updates: [] as Record<string, unknown>[], extensions: [] as Record<string, unknown>[], failExtension: false };
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { id: 'u1', name: 'Tester', metadata: { focusLayout: 'sidebar', timerPreferences: { focusDuration: 25 } }, memberships: [{ workspaceId: 'ws1', role: 'OWNER', workspace: { id: 'ws1', name: 'Test' } }] } } }));
  await page.route('**/api/v1/planner/week*', route => route.fulfill({ json: { ...planner, tasks: includeSecondTask ? [storedTask, secondTask] : [storedTask], timeBlocks: includeSecondTask ? [storedBlock, nextBlock, secondBlock] : [storedBlock, nextBlock] } }));
  await page.route('**/api/v1/tasks/t1', route => {
    if (route.request().method() === 'PATCH') { const update = route.request().postDataJSON(); state.updates.push(update); Object.assign(storedTask, update, { version: storedTask.version + 1 }); }
    return route.fulfill({ json: storedTask });
  });
  await page.route('**/api/v1/tasks/t2', route => route.fulfill({ json: secondTask }));
  await page.route('**/api/v1/focus-sessions/schedule', route => route.fulfill({ json: { mode: 'empty', plan: [] } }));
  await page.route('**/api/v1/focus-sessions', route => { state.completions.push(route.request().postDataJSON()); return route.fulfill({ json: { session: { id: 'saved-session' } } }); });
  await page.route('**/api/v1/planner/time-blocks/b1/extend', route => {
    const input = route.request().postDataJSON(); state.extensions.push(input);
    if (state.failExtension) return route.fulfill({ status: 503, json: { message: 'Extension unavailable. Please retry.' } });
    const endTime = new Date(new Date(storedBlock.endTime).getTime() + input.minutes * 60000).toISOString();
    storedBlock = { ...storedBlock, endTime };
    nextBlock = { ...nextBlock, startTime: endTime, endTime: new Date(new Date(endTime).getTime() + 3600000).toISOString() };
    return route.fulfill({ json: { block: storedBlock, rescheduledBlock: nextBlock } });
  });
  return state;
}

test('Planner task click opens the reserved Focus duration and completes the versioned task', async ({ page }) => {
  const state = await scheduledFocusMock(page);
  await page.goto('/app/planner?mode=day&date=' + day);
  await page.getByRole('button', { name: task.title, exact: true }).click();
  await expect(page).toHaveURL(/focus\?.*task=t1.*block=b1/);
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await expect(setup).toContainText('60 minutes reserved');
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page).toHaveTitle(/60:00/);
  await page.clock.install();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(60 * 60000);
  const decision = page.getByRole('dialog', { name: 'Is this task done?' });
  await expect(decision).toBeVisible();
  expect(state.completions).toHaveLength(1);
  expect(state.completions[0]).toMatchObject({ duration: 3600, taskId: 't1', projectId: 'p1', type: 'custom' });
  await decision.getByRole('button', { name: 'Mark task done' }).click();
  await expect.poll(() => state.updates).toEqual([{ status: 'DONE', version: 7 }]);
  await expect(page.getByText('Task completed', { exact: true }).first()).toBeVisible();
});

test('multi-hour Focus blocks support a custom split without changing account defaults', async ({ page }) => {
  await scheduledFocusMock(page, 240); await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/focus?task=t1&block=b1&date=' + day);
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await expect(setup).toContainText('240 minutes reserved');
  await expect(setup.getByLabel('Work minutes')).toHaveValue('45');
  await setup.getByLabel('Session plan').selectOption('custom');
  await setup.getByLabel('Work minutes').fill('30');
  await setup.getByLabel('Break minutes').fill('0');
  expect(await setup.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page).toHaveTitle(/30:00/);
  await expect(page.getByText(/Session 1 of 8/)).toBeVisible();
  await page.clock.install(); await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(30 * 60000);
  const decision = page.getByRole('dialog', { name: 'Is this task done?' });
  await decision.getByRole('button', { name: 'Continue to next session' }).click();
  await expect(page).toHaveTitle(/30:00/);
  await expect(page.getByText(/Session 2 of 8/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume session plan' }).click();
  await expect(page.getByText(/Session 2 of 8/)).toBeVisible();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(10 * 60000);
  await page.getByTitle('Click or press Enter to pause', { exact: true }).click();
  await page.reload();
  await expect(page).toHaveTitle(/20:00/);
  expect(await page.evaluate(() => localStorage.getItem('krama.focus.u1.settings'))).toBeNull();
});

test('Focus overrun requires explicit next-block rescheduling and retains the decision on failure', async ({ page }) => {
  const state = await scheduledFocusMock(page);
  await page.goto('/focus?task=t1&block=b1&date=' + day);
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await page.clock.install(); await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(60 * 60000);
  const decision = page.getByRole('dialog', { name: 'Is this task done?' });
  const extend = decision.getByRole('button', { name: 'Reschedule next block and extend' });
  await expect(extend).toBeDisabled();
  await decision.getByLabel('Reschedule next block').check();
  state.failExtension = true; await extend.click();
  await expect(decision.getByRole('alert')).toContainText('Extension unavailable');
  await expect(page).toHaveTitle(/00:00/);
  state.failExtension = false; await extend.click();
  await expect(decision).toBeHidden(); await expect(page).toHaveTitle(/15:00/);
  expect(state.extensions[0].extensionId).toBe(state.extensions[1].extensionId);
  expect(state.extensions.at(-1)).toMatchObject({ minutes: 15, rescheduleBlockId: 'b2', expectedEndTime: day + 'T10:00:00.000Z' });
  expect(state.completions).toHaveLength(1);
});

test('weekly task titles open Focus with Enter while the edit action retains task details', async ({ page }) => {
  await scheduledFocusMock(page);
  await page.goto('/app/planner?mode=plan&date=' + day);
  await page.getByRole('button', { name: 'Edit task ' + task.title, exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Directive Title *', { exact: true })).toHaveValue(task.title);
  await page.keyboard.press('Escape');
  const title = page.getByRole('button', { name: task.title, exact: true });
  await title.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Plan your focus time' })).toContainText('60 minutes reserved');
});

async function changeFocusSelection(page: Page, taskId: string, blockId: string) {
  await page.evaluate(({ taskId, blockId, day }) => {
    history.pushState({}, '', '/focus?task=' + taskId + '&block=' + blockId + '&date=' + day);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, { taskId, blockId, day });
}

test('changing Focus tasks isolates paused timers and restores the original task on Back', async ({ page }) => {
  const state = await scheduledFocusMock(page, 60, true);
  await page.goto('/focus?task=t1&block=b1&date=' + day);
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await page.clock.install();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(10 * 60000);
  await page.getByTitle('Click or press Enter to pause', { exact: true }).click();
  await changeFocusSelection(page, 't2', 'b3');
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await expect(setup).toContainText(secondTask.title);
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await expect(setup).toBeHidden();
  await expect(page).toHaveTitle(/30:00/);
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(30 * 60000);
  await expect(page.getByRole('dialog', { name: 'Is this task done?' })).toContainText(secondTask.title);
  expect(state.completions).toHaveLength(1);
  expect(state.completions[0]).toMatchObject({ taskId: 't2', duration: 1800 });
  await page.goBack();
  await expect(page).toHaveTitle(/50:00/);
  expect(state.updates).toHaveLength(0);
});

test('retrying an earlier task save cannot advance the newly selected Focus task', async ({ page }) => {
  const state = await scheduledFocusMock(page, 60, true);
  await page.addInitScript(({ day }) => {
    localStorage.setItem('krama.focus.unsaved.u1.ws1', JSON.stringify({
      completionId: 'bf50f14d-dedf-49d2-a2e4-4fb7e4348a94',
      startTime: day + 'T09:00:00.000Z', endTime: day + 'T10:00:00.000Z',
      duration: 3600, type: 'custom', taskId: 't1',
      plannerSelectionKey: 'ws1:' + day + ':b1:t1',
    }));
  }, { day });
  await page.goto('/focus?task=t2&block=b3&date=' + day);
  await page.getByRole('button', { name: 'Retry saving session' }).click();
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await expect(setup).toContainText(secondTask.title);
  await expect(page.getByRole('dialog', { name: 'Is this task done?' })).toBeHidden();
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page).toHaveTitle(/30:00/);
  expect(state.completions).toHaveLength(1);
  expect(state.completions[0]).toMatchObject({ taskId: 't1', duration: 3600 });
  expect(state.completions[0]).not.toHaveProperty('plannerSelectionKey');
  expect(state.updates).toHaveLength(0);
});

test('Focus setup owns keyboard shortcuts without opening another modal', async ({ page }) => {
  await scheduledFocusMock(page);
  await page.goto('/focus?task=t1&block=b1&date=' + day);
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await setup.focus();
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(setup).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(setup).toBeHidden();
});

test('a delayed earlier session response cannot clear a newer unsaved task session', async ({ page }) => {
  await scheduledFocusMock(page, 1, true);
  let releaseFirst!: () => void;
  const firstResponse = new Promise<void>(resolve => { releaseFirst = resolve; });
  let requests = 0;
  await page.route('**/api/v1/focus-sessions', async route => {
    const payload = route.request().postDataJSON();
    requests++;
    if (requests === 1) await firstResponse;
    if (payload.taskId === 't2') return route.fulfill({ status: 503, json: { message: 'Save unavailable' } });
    return route.fulfill({ json: { session: { id: payload.completionId } } });
  });
  await page.goto('/focus?task=t1&block=b1&date=' + day);
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await page.clock.install();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(60000);
  await expect.poll(() => requests).toBe(1);
  await changeFocusSelection(page, 't2', 'b3');
  await page.getByRole('button', { name: 'Retry saving session' }).click();
  const setup = page.getByRole('dialog', { name: 'Plan your focus time' });
  await setup.getByLabel('Session plan').selectOption('custom');
  await setup.getByLabel('Work minutes').fill('1');
  await setup.getByLabel('Break minutes').fill('0');
  await setup.getByRole('button', { name: 'Use this plan' }).click();
  await page.getByTitle('Click or press Enter to start', { exact: true }).click();
  await page.clock.fastForward(60000);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('krama.focus.unsaved.u1.ws1') || 'null')?.taskId)).toBe('t2');
  const oldResponse = page.waitForResponse(response => response.url().endsWith('/focus-sessions') && response.status() === 200);
  releaseFirst(); await oldResponse;
  await page.clock.runFor(4000);
  await expect(page.getByRole('button', { name: 'Retry saving session' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('krama.focus.unsaved.u1.ws1') || 'null')?.taskId)).toBe('t2');
});
