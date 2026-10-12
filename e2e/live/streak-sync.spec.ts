import { test, expect } from './fixtures';

test('Goal logging and habit undo keep streaks synchronized', async ({ page, account }) => {
  const goal = await account.call('POST', 'goals', { title: 'Streak synchronization goal', type: 'quarterly' }, 201);
  const habit = await account.call('POST', 'habits', { name: 'Streak synchronization habit', linkedGoalId: goal.id }, 201);
  await account.signIn(page); await page.goto('/app/goals');
  await page.getByText(goal.title, { exact: true }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Goal details' });
  await expect(drawer.getByText(habit.name, { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Log Today', exact: true }).click();
  await expect.poll(async () => (await account.call('GET', `habits/${habit.id}`)).streak).toBe(1);
  await expect(drawer.getByText(/1d$/)).toBeVisible();
  await drawer.getByRole('button', { name: habit.name, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/habits/);
  await expect(page.getByText(habit.name, { exact: true }).first()).toBeVisible();
  await page.getByTitle('Completed today — click to undo', { exact: true }).click();
  await expect.poll(async () => (await account.call('GET', `habits/${habit.id}`)).streak).toBe(0);
  expect((await account.call('GET', `habits/${habit.id}`)).completions).toHaveLength(0);
  await page.goto('/app/goals'); await page.getByText(goal.title, { exact: true }).first().click();
  await expect(drawer.getByText(/0d$/)).toBeVisible();
});
