// Regression checks for the remaining workflows. All API data is synthetic.
import { test, expect, type BrowserContext } from '@playwright/test';
import { bugFixture, seedNotifications } from '../fixtures/current-bug-fixture';
test.use({ timezoneId: 'Asia/Kolkata' });

async function habits(context: BrowserContext) {
  const state = await bugFixture(context);
  const habit = { id: 'leftover-habit', name: 'Daily reading', version: 1, cadence: 'daily', category: 'health', difficulty: 'EASY', timeOfDay: 'morning', expectedDurationMinutes: 15, scheduledDays: [0, 1, 2, 3, 4, 5, 6], completions: [], metadata: {}, streak: 0, bestStreak: 0, createdAt: '2026-10-01T12:00:00Z' };
  await context.route('**/api/v1/habits**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/habits') ? [habit] : habit }));
  return state;
}

test('Moving the open document advances its save revision and subsequent edits save', async ({ page, context }) => {
  const state = await bugFixture(context);
  const doc = state.documents[0];
  const originalRevision = doc.updatedAt;
  state.documents.push({ ...doc, id: 'review-parent', title: 'Destination parent', tags: [] });
  await context.route('**/api/v1/documents/review-document/move', route => {
    expect(route.request().postDataJSON().expectedUpdatedAt).toBe(originalRevision);
    doc.parentId = 'review-parent'; doc.updatedAt = new Date(new Date(originalRevision).getTime() + 1000).toISOString();
    return route.fulfill({ json: doc });
  });
  let bodyRevision = '';
  await context.route('**/api/v1/documents/review-document/content', route => {
    bodyRevision = route.request().postDataJSON().expectedUpdatedAt;
    return route.fulfill({ status: bodyRevision === doc.updatedAt ? 200 : 409, json: bodyRevision === doc.updatedAt ? { updatedAt: doc.updatedAt } : { message: 'Document changed' } });
  });
  await page.goto('/app/brain?doc=review-document');
  await page.getByRole('button', { name: 'More document actions' }).click();
  await page.getByRole('button', { name: 'Move Document...', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Move Document', exact: true });
  await dialog.getByLabel('Target Parent').selectOption('review-parent');
  await dialog.getByRole('button', { name: 'Move Document', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Document body' }).fill('My edit after moving');
  await expect.poll(() => bodyRevision).toBe(doc.updatedAt);
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Conflict' })).toHaveCount(0);
  expect(bodyRevision).not.toBe(originalRevision);
});

test('Importing into a selected empty space uses that space', async ({ page, context }) => {
  await bugFixture(context);
  let targetSpace = '';
  await context.route('**/api/v1/documents/import', route => {
    targetSpace = route.request().postDataJSON().spaceId;
    return route.fulfill({ json: { document: null, message: 'Synthetic import accepted', totalImported: 1 } });
  });
  await page.goto('/app/brain');
  await page.getByLabel('Document space').selectOption('other-space');
  await expect(page.getByText('No Specification Selected', { exact: true })).toBeVisible();
  await page.getByLabel('Import document file').setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic imported note') });
  await expect.poll(() => targetSpace).toBe('other-space');
});

test('Changing a note lifecycle preserves its Inbox marker and other badges', async ({ page, context }) => {
  const state = await bugFixture(context);
  state.documents[0].statusBadges = ['Inbox', 'Custom badge', 'IN_REVIEW'];
  await page.goto('/app/brain');
  await page.locator('.workspace-document-properties > summary').click();
  await page.getByLabel('Document lifecycle status').selectOption('DRAFT');
  await expect.poll(() => state.documents[0].statusBadges).toEqual(['Inbox', 'Custom badge', 'DRAFT']);
  await expect(page.getByLabel('Document lifecycle status')).toHaveValue('DRAFT');
  await page.getByRole('link', { name: /^Inbox/ }).click();
  await expect(page.getByRole('button', { name: 'Task to organise', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review document', exact: true })).toBeVisible();
});

test('Projects remains usable through a document outage and retry restores document counts', async ({ page, context }) => {
  const state = await bugFixture(context); state.documentsBroken = true;
  await context.route('**/api/v1/projects', route => route.fulfill({ json: [{ id: 'leftover-project', name: 'Available project', status: 'active', progress: 0, position: 0 }] }));
  await page.goto('/app/projects');
  await expect(page.getByText('Available project', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Some project details are unavailable', { timeout: 15000 });
  await expect(page.getByText('Docs unavailable', { exact: true })).toBeVisible();
  state.documentsBroken = false;
  state.documents[0].projectId = 'leftover-project';
  await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('1 Doc', { exact: true })).toBeVisible();
});

test('Habits remain loggable during a goals outage and retry recovers goal links', async ({ page, context }) => {
  await habits(context);
  let broken = true;
  let goalRequests = 0;
  await context.route('**/api/v1/goals**', route => { goalRequests++; return route.fulfill({ status: broken ? 503 : 200, json: broken ? { message: 'Synthetic goals outage' } : [] }); });
  await page.goto('/app/habits');
  await expect(page.getByRole('heading', { name: 'Daily reading', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Goal links are unavailable', { timeout: 15000 });
  const posted = page.waitForRequest(request => request.url().endsWith('/habits/leftover-habit/log') && request.method() === 'POST');
  const beforeLog = goalRequests;
  await page.getByRole('button', { name: 'Complete for today: Daily reading', exact: true }).click();
  await posted;
  await expect.poll(() => goalRequests, { timeout: 15000 }).toBeGreaterThanOrEqual(beforeLog + 4);
  await expect(page.getByRole('alert')).toContainText('Goal links are unavailable', { timeout: 15000 });
  broken = false;
  await page.getByRole('button', { name: 'Try Again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Habit completion after midnight uses the current date even before a clock refresh', async ({ page, context }) => {
  await habits(context);
  await page.clock.install({ time: new Date('2026-10-17T23:59:00+05:30') });
  await page.goto('/app/habits');
  const toggle = page.getByRole('button', { name: 'Complete for today: Daily reading', exact: true });
  await expect(toggle).toBeVisible();
  await page.clock.setSystemTime(new Date('2026-10-18T00:00:10+05:30'));
  const posted = page.waitForRequest(request => request.url().endsWith('/habits/leftover-habit/log') && request.method() === 'POST');
  await toggle.click();
  expect((await posted).postDataJSON().date).toBe('2026-10-18');
  expect(await page.evaluate(() => new Date().getDate())).toBe(18);
});

test('Habit card completion buttons have descriptive names and 44px targets', async ({ page, context }) => {
  await habits(context);
  await page.goto('/app/habits');
  const toggle = page.getByRole('button', { name: 'Complete for today: Daily reading', exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAccessibleName('Complete for today: Daily reading');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await toggle.focus(); await expect(toggle).toBeFocused();
});

test('Notifications fit inside a very short viewport', async ({ page, context }) => {
  const state = await bugFixture(context); seedNotifications(state);
  await page.setViewportSize({ width: 390, height: 240 });
  await page.goto('/app/inbox');
  await page.getByRole('button', { name: 'Notifications', exact: true }).filter({ visible: true }).click();
  const panel = page.getByRole('region', { name: 'Notifications', exact: true });
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(240);
});

test('The habit view refreshes automatically when its local day changes', async ({ page, context }) => {
  await habits(context);
  await page.clock.install({ time: new Date('2026-10-17T23:59:55+05:30') });
  await page.goto('/app/habits');
  await expect(page.getByRole('heading', { name: 'Daily reading', exact: true })).toBeVisible();
  await expect(page.locator('.habit-history-grid [title="2026-10-17 · not logged"]')).toBeVisible();
  await page.clock.runFor(6000);
  await expect(page.locator('.habit-history-grid [title="2026-10-18 · not logged"]')).toBeVisible();
  await expect(page.locator('.habit-history-grid [title="2026-10-17 · missed"]')).toBeVisible();
});
