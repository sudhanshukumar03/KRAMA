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
