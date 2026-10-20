import { test, expect } from '@playwright/test';
import { designFixture } from '../../scripts/media/example-workspace';

for (const kind of ['project', 'habit'] as const) {
  const collection = kind === 'project' ? 'projects' : 'habits';
  const label = kind === 'project' ? 'Project to connect' : 'Habit to connect';
  const fieldset = kind === 'project' ? 'Connected projects' : 'Connected habits';
  const row = (id: string) => ({ id, name: `Available ${kind} ${id}`, status: 'active', version: 1,
    goalId: null, linkedGoalId: null, metadata: {}, tasks: [], completions: [], cadence: 'daily', createdAt: '2026-10-01T12:00:00Z' });
  test(`a removed ${kind} selection cannot report a successful goal connection`, async ({ page, context }) => {
    await page.clock.install({ time: new Date('2026-10-17T09:30:00Z') });
    await designFixture(context);
    let removed = false; let reads = 0;
    await context.route(url => url.pathname === `/api/v1/${collection}`, route => {
      reads++;
      return route.fulfill({ json: removed ? [row('available-b')] : [row('removed-a'), row('available-b')] });
    });
    await page.goto('/app/goals?goal=design-goal-0');
    const section = page.getByRole('group', { name: fieldset, exact: true });
    await section.getByRole('button', { name: 'Link Existing', exact: true }).first().click();
    const select = page.getByLabel(label, { exact: true });
    await select.selectOption('removed-a');
    removed = true;
    const before = reads;
    await page.clock.fastForward(301000);
    await page.evaluate(() => { window.dispatchEvent(new Event('offline')); window.dispatchEvent(new Event('online')); });
    await expect.poll(() => reads).toBeGreaterThan(before);
    await expect(select.locator('option[value="removed-a"]')).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled();
    await expect(select).toHaveValue('');
    await expect(page.getByText('Project connected to goal', { exact: true })).toHaveCount(0);
  });

  test(`failed ${kind} linking retains its selector and version for retry`, async ({ page, context }) => {
    await designFixture(context);
    let linked = false; let writes = 0;
    await context.route(url => url.pathname === `/api/v1/${collection}`, route => route.fulfill({ json: [
      { ...row('retry-a'), ...(kind === 'project' ? { goalId: linked ? 'design-goal-0' : null } : { linkedGoalId: linked ? 'design-goal-0' : null }) }, row('available-b'),
    ] }));
    await context.route(url => url.pathname === `/api/v1/${collection}/retry-a`, route => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      expect(route.request().postDataJSON().version).toBe(1);
      if (++writes === 1) return route.fulfill({ status: 503, json: { message: 'Synthetic connection outage' } });
      linked = true;
      return route.fulfill({ json: { ...row('retry-a'), ...route.request().postDataJSON(), version: 2 } });
    });
    await page.goto('/app/goals?goal=design-goal-0');
    const section = page.getByRole('group', { name: fieldset, exact: true });
    await section.getByRole('button', { name: 'Link Existing', exact: true }).first().click();
    const select = page.getByLabel(label, { exact: true });
    await select.selectOption('retry-a'); await section.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(page.getByText(/Failed to connect .*Synthetic connection outage/)).toBeVisible();
    await expect(select).toBeVisible(); await expect(select).toHaveValue('retry-a');
    await section.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(select).toHaveCount(0);
    expect(writes).toBe(2);
  });
}
