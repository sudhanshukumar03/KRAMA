import { test, expect } from './fixtures';

for (const cadence of ['daily', 'weekly']) test(`${cadence} habit created today cannot be completed earlier in its Planner week`, async ({ page, account }) => {
  const name = `Created today ${cadence}`;
  const habit = await account.call('POST', 'habits', { name, cadence, scheduledDays: [0,1,2,3,4,5,6], pinnedToPlanner: true }, 201);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(habit.createdAt));
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  const end = new Date(monday); end.setUTCDate(end.getUTCDate()+6);
  const week = await account.call('GET', `planner/week?start=${monday.toISOString().slice(0,10)}&end=${end.toISOString().slice(0,10)}`);
  const earlier = week.occurrences.filter((occ: any) => occ.habitId===habit.id && occ.date.slice(0,10)<today);
  for (const occurrence of earlier) expect(occurrence.unavailableReason).toBe('before_creation');
  const yesterday = new Date(`${today}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const date = yesterday.toISOString().slice(0,10);
  const rejected = await account.call('POST', `habits/${habit.id}/log`, { date, dateIso: `${date}T12:00:00.000Z` }, 400);
  expect(rejected.message).toContain('had not been created');
  expect((await account.call('GET', `habits/${habit.id}`)).completions).toHaveLength(0);
  await account.signIn(page);
  await page.goto(`/app/planner?mode=plan&date=${today}`);
  for (const occurrence of earlier) {
    const label = new Date(occurrence.date).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
    await expect(page.getByRole('button', { name: `Mark ${name} complete on ${label}`, exact: true })).toBeDisabled();
  }
  const todayLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const complete = page.getByRole('button', { name: `Mark ${name} complete on ${todayLabel}`, exact: true });
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect.poll(async () => (await account.call('GET', `habits/${habit.id}`)).completions.length).toBe(1);
  const recorded = await account.call('GET', `habits/${habit.id}`);
  expect(recorded.completions[0].date.slice(0,10)).toBe(today);
  const undo = page.getByRole('button', { name: `Mark ${name} incomplete on ${todayLabel}`, exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(async () => (await account.call('GET', `habits/${habit.id}`)).completions.length).toBe(0);
});
