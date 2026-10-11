import { test, expect } from './fixtures';

test('Goal creation and linked project/habit navigation persist', async ({ page, account }) => {
  const goal = await account.call('POST', 'goals', { title: 'Linked UI goal', type: 'quarterly' }, 201);
  const habit = await account.call('POST', 'habits', { name: 'Linked UI habit', linkedGoalId: goal.id }, 201);
  const project = await account.call('POST', 'projects', { name: 'Linked UI project', goalId: goal.id }, 201);
  await account.signIn(page); await page.goto('/app/goals');
  await expect(page.getByText(goal.title, { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'New Aspiration', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New Life Aspiration' });
  await form.getByLabel('Aspiration / Goal Title').fill('UI-created aspiration');
  await form.getByRole('button', { name: 'Create Aspiration', exact: true }).click(); await expect(form).toBeHidden();
  await expect(page.getByText('UI-created aspiration', { exact: true }).first()).toBeVisible();
  expect((await account.call('GET', 'goals')).some((item: any) => item.title === 'UI-created aspiration')).toBe(true);
  await page.getByText(goal.title, { exact: true }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await expect(drawer.getByText(habit.name, { exact: true })).toBeVisible();
  await expect(drawer.getByText(project.name, { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: habit.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/habits\\?goalId=${goal.id}`));
  await expect(page.getByText(habit.name, { exact: true }).first()).toBeVisible();
  await page.goto('/app/goals'); await expect(page.getByText('UI-created aspiration', { exact: true }).first()).toBeVisible();
});
