import { test, expect } from '@playwright/test';
import { bugFixture } from '../fixtures/current-bug-fixture';

for (const theme of ['light', 'dark']) {
  test(`large task views keep bounded rows and keyboard paging in ${theme}`, async ({ page, context }) => {
    const state = await bugFixture(context);
    state.tasks = Array.from({ length: 120 }, (_, index) => ({ ...state.tasks[0], id: `paged-task-${index}`, title: `Paged task ${index}`, status: 'TODO', position: index, parentTaskId: null, metadata: { inbox: false } }));
    await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), theme);
    await page.goto('/app/board');
    const column = page.getByRole('region', { name: 'To Do column', exact: true });
    await expect(column.getByRole('button', { name: /^Move directive/ })).toHaveCount(50);
    await column.getByRole('button', { name: 'Next To Do tasks', exact: true }).click();
    await expect(column.getByRole('button', { name: 'Move directive Paged task 50', exact: true })).toBeFocused();
    await page.getByLabel('Search tasks', { exact: true }).fill('Paged task 119');
    await expect(column.getByRole('button', { name: /^Move directive/ })).toHaveCount(1);
    await page.getByLabel('Search tasks', { exact: true }).clear();
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await expect(page.getByRole('row')).toHaveCount(51);
    await page.getByRole('button', { name: 'Next task list', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Paged task 50', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Next task list', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Calendar View', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'task dates pages' })).toContainText('1–50 of 120');
  });

  test(`large document trees reveal deep links beyond the first page in ${theme}`, async ({ page, context }) => {
    const state = await bugFixture(context);
    const template = state.documents[0];
    state.documents = Array.from({ length: 120 }, (_, index) => ({ ...template, id: `paged-note-${index}`, title: `Paged note ${index}` }));
    await context.route('**/api/v1/documents/paged-note-*', route => route.fulfill({ json: state.documents.find(doc => doc.id === new URL(route.request().url()).pathname.split('/').at(-1)) }));
    await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), theme);
    await page.goto('/app/brain?doc=paged-note-119');
    await expect(page.getByRole('textbox', { name: 'Document body', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'documents', exact: true }).locator('button[aria-current="page"]')).toContainText('Paged note 119');
    await expect(page.getByRole('navigation', { name: 'documents pages', exact: true })).toContainText('101–120 of 120');
    await page.getByRole('button', { name: 'Previous documents', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Paged note 50', exact: false }).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/doc=paged-note-50/);
  });
}
