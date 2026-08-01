import { test, expect } from '@playwright/test';

test.describe('Critical Path E2E', () => {
  const userPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('response', resp => {
      if (resp.status() === 429) {
        console.log('429 ON URL:', resp.url());
      }
    });
  });

  test('Signup -> Create Project -> Create Task -> Verify UI -> Refresh Persistence', async ({ page, context }) => {
    const userEmail = `e2e_${Date.now()}_${Math.random()}@krama.com`;
    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'E2E User');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');

    // Should redirect to /app (Dashboard)
    await expect(page).toHaveURL(/\/app/);

    // 2. Create a Project
    await page.goto('/app/projects');
    await page.click('text=New Initiative');
    await page.fill('input[placeholder="e.g., Autonomous Decision Engine v2"]', 'E2E Project');
    await page.click('button:has-text("Launch Initiative")');
    await expect(page.locator('text=E2E Project').first()).toBeVisible();

    // 3. Create a Task (Issue)
    await page.goto('/app/board');
    await page.getByText('Quick Add').first().click();
    await page.locator('h3:has-text("Create New Task")').waitFor({ state: 'visible' });
    await page.locator('input[type="text"]').last().fill('E2E Task');
    await page.locator('button[type="submit"]', { hasText: 'Create Task' }).click();
    await expect(page.locator('text=E2E Task').first()).toBeVisible();

    // 4. Hard refresh and verify data persists (Audit finding closure)
    await page.reload();
    await expect(page.locator('text=E2E Task').first()).toBeVisible();

    // 5. Log out
    await page.locator('button', { hasText: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login/);

    // 6. Log back in and verify data still present
    await page.goto('/login');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    await page.goto('/app/board');
    await expect(page.locator('text=E2E Task').first()).toBeVisible();

  });
});
