import { test, expect as baseExpect } from '@playwright/test';
import { bugFixture, seedNotifications } from '../fixtures/current-bug-fixture';
// Error states appear after the application's configured query retries.
const expect = baseExpect.configure({ timeout: 15000 });

test('Brain tag changes immediately update the open editor and retain its body', async ({ page, context }) => {
  await bugFixture(context);
  await page.goto('/app/brain');
  await page.getByText('Document properties', { exact: false }).click();
  await expect(page.getByText('#existing', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tag', exact: true }).click();
  await page.getByRole('textbox', { name: 'New tag name' }).fill('newtag');
  await page.getByRole('button', { name: 'Save tag', exact: true }).click();
  await expect(page.getByText('#newtag', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove #existing tag' }).click();
  await expect(page.getByText('#existing', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Document body' })).toHaveText('Open linked task');
});

test('Brain task links select and load the exact task on the Board', async ({ page, context }) => {
  const state = await bugFixture(context);
  await page.goto('/app/brain');
  await page.getByRole('link', { name: 'Open linked task', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board\?task=review-task$/);
  await expect.poll(() => state.taskGets).toContain('review-task');
});

for (const stale of ['legacy', 'scoped']) test(`Brain ignores an invalid ${stale} space and shows current documents`, async ({ page, context }) => {
  const state = await bugFixture(context);
  await page.addInitScript(({ stale, userId, workspaceId }) => localStorage.setItem(stale === 'legacy' ? 'krama_brain_selected_space' : `krama:brain-space:v1:${userId}:${workspaceId}`, 'foreign-space'), { stale, userId: state.userId, workspaceId: state.workspaceId });
  await page.goto('/app/brain');
  await expect(page.getByRole('textbox', { name: 'Document body' })).toBeVisible();
  await expect(page.getByLabel('Document space')).toHaveValue('ALL');
  expect(state.requests.some(request => request.includes('spaceId=foreign-space'))).toBe(false);
});

test('Brain remembers valid spaces separately for each workspace', async ({ page, context }) => {
  const state = await bugFixture(context);
  await page.goto('/app/brain');
  await page.getByLabel('Document space').selectOption('other-space');
  await expect(page.getByLabel('Document space')).toHaveValue('other-space');
  await page.reload();
  await expect(page.getByLabel('Document space')).toHaveValue('other-space');
  state.workspaceId = 'second-workspace';
  state.spaces = [{ id: 'second-space', name: 'Second workspace space' }];
  await page.reload();
  await expect(page.getByLabel('Document space')).toHaveValue('ALL');
  await page.getByLabel('Document space').selectOption('second-space');
  state.workspaceId = 'review-workspace';
  state.spaces = [{ id: 'review-space', name: 'Current space' }, { id: 'other-space', name: 'Other space' }];
  await page.reload();
  await expect(page.getByLabel('Document space')).toHaveValue('other-space');
});

for (const source of ['documents', 'tasks']) test(`Inbox retains usable content when ${source} fail, then recovers`, async ({ page, context }) => {
  const state = await bugFixture(context);
  state.documentsBroken = source === 'documents'; state.tasksBroken = source === 'tasks';
  await page.goto('/app/inbox');
  const item = page.getByRole('button', { name: source === 'documents' ? 'Task to organise' : 'Review document', exact: true });
  await expect(item).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(source === 'documents' ? 'Could not load notes' : 'Could not load tasks');
  await expect(page.getByText('Your Inbox is clear', { exact: true })).toHaveCount(0);
  const failedRequestPrefix = source === 'documents' ? 'GET /documents?' : 'GET /tasks';
  const failedRequestsBeforeFiling = state.requests.filter(request => request.startsWith(failedRequestPrefix)).length;
  // The available source remains actionable while the other feed is down.
  await page.getByRole('button', { name: source === 'documents' ? 'File Task to organise' : 'File Review document', exact: true }).click();
  await expect(item).toHaveCount(0);
  // Filing refetches the feeds. Keep the failed source down until those retries
  // finish, then explicitly exercise the recovery button.
  await expect.poll(() => state.requests.filter(request => request.startsWith(failedRequestPrefix)).length).toBeGreaterThanOrEqual(failedRequestsBeforeFiling + 4);
  await expect(page.getByRole('alert')).toContainText(source === 'documents' ? 'Could not load notes' : 'Could not load tasks');
  state.documentsBroken = false; state.tasksBroken = false;
  await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.inbox-list > li')).toHaveCount(1);
});

test('Trash shows loading, errors with retry, and confirmed empty states separately', async ({ page, context }) => {
  const state = await bugFixture(context); state.trashDelay = 1200; state.trashBroken = true;
  await page.goto('/app/brain');
  await expect(page.getByRole('textbox', { name: 'Document body' })).toBeVisible();
  await page.getByRole('tab', { name: 'Soft-Deleted Documents (Trash)' }).click();
  await expect(page.getByText('Loading Trash...', { exact: true })).toBeVisible();
  await expect(page.getByText('Trash is empty.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Could not load Trash');
  await expect(page.getByText('Trash is empty.', { exact: true })).toHaveCount(0);
  state.trashBroken = false; state.trashDelay = 0;
  state.deleted = [{ ...state.documents[0], id: 'deleted-note', title: 'Deleted note', deletedAt: '2026-10-17T09:00:00Z' }];
  await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByText('Deleted note', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  state.deleted = []; await page.reload();
  await page.getByRole('tab', { name: 'Soft-Deleted Documents (Trash)' }).click();
  await expect(page.getByText('Trash is empty.', { exact: true })).toBeVisible();
});

test('Profile shows account identity without invented subscription or timer labels', async ({ page, context }) => {
  await bugFixture(context);
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Profile Details', { exact: true })).toBeVisible();
  await expect(page.getByText('PRO', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Focused', { exact: true })).toHaveCount(0);
});

for (const width of [390, 1280]) test(`${width}px: older unread notifications are counted, keyboard accessible and can be marked read`, async ({ page, context }) => {
  const state = await bugFixture(context); seedNotifications(state);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Notifications', exact: true }).filter({ visible: true }).click();
  const panel = page.getByRole('region', { name: 'Notifications', exact: true });
  await expect(panel.getByText('1 unread', { exact: true })).toBeVisible();
  const older = panel.getByRole('button', { name: 'Load older notifications', exact: true });
  await older.focus(); await page.keyboard.press('Enter');
  const oldItem = panel.locator('[data-notification-id="notification-50"]');
  await expect(oldItem).toBeFocused();
  await expect(oldItem).toContainText('Older unread reminder');
  await panel.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(panel.getByText('1 unread', { exact: true })).toHaveCount(0);
  await expect(oldItem).toBeFocused();
  await oldItem.click();
  await expect(page).toHaveURL(/\/app\/board\?task=review-task$/);
});

test('Notification pagination failures preserve existing rows and provide a retry', async ({ page, context }) => {
  const state = await bugFixture(context); seedNotifications(state); state.olderBroken = true;
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Notifications', exact: true }).filter({ visible: true }).click();
  const panel = page.getByRole('region', { name: 'Notifications', exact: true });
  await panel.getByRole('button', { name: 'Load older notifications', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Retry older notifications', exact: true })).toBeVisible();
  await expect(panel.getByText('Read notification 0', { exact: true })).toBeVisible();
  state.olderBroken = false;
  await panel.getByRole('button', { name: 'Retry older notifications', exact: true }).click();
  await expect(panel.getByText('Older unread reminder', { exact: true })).toBeVisible();
});

test('Mark all read uses the full unread total even before older pages are opened', async ({ page, context }) => {
  const state = await bugFixture(context); seedNotifications(state);
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Notifications', exact: true }).filter({ visible: true }).click();
  const panel = page.getByRole('region', { name: 'Notifications', exact: true });
  await panel.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await expect(panel.getByText('1 unread', { exact: true })).toHaveCount(0);
  expect(state.notifications.every(item => item.read)).toBe(true);
  await panel.getByRole('button', { name: 'Load older notifications', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0);
});
