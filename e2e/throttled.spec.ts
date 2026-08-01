import { test, expect } from '@playwright/test';

test('Quick Add button disables during loading on throttled network', async ({ page }) => {
  const testEmail = `e2e_throttle_${Date.now()}@test.com`;
  
  // 1. Signup & Project Create
  await page.goto('/signup');
  await page.locator('input[type="text"]').fill('Throttled User');
  await page.locator('input[type="email"]').fill(`test-${Date.now()}@krama.com`);
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app/);

  await page.goto('/app/projects');
  await page.getByText('New Project').click();
  await page.locator('input[placeholder="Project Name"]').fill('Throttled Project');
  await page.locator('input[placeholder="Project Identifier (e.g. KRM)"]').fill('THR');
  await page.locator('button[type="submit"]', { hasText: 'Create Project' }).click();
  await expect(page.locator('text=Throttled Project').first()).toBeVisible();

  // 2. Delay the projects API response by 3 seconds to simulate throttled network
  await page.route('**/api/projects', async (route) => {
    // Delay the response for 3 seconds
    await new Promise(f => setTimeout(f, 3000));
    await route.continue();
  });

  // 3. Hard reload to Kanban Board
  await page.goto('/app/board');

  // The Quick Add button should be disabled and show 'Loading...' initially
  const quickAddBtn = page.getByRole('button', { name: /loading/i }).first();
  await expect(quickAddBtn).toBeVisible({ timeout: 5000 });
  await expect(quickAddBtn).toBeDisabled();

  // Wait for it to become active after the API resolves
  const activeQuickAddBtn = page.getByRole('button', { name: /quick add/i }).first();
  await expect(activeQuickAddBtn).toBeVisible({ timeout: 5000 });
  await expect(activeQuickAddBtn).toBeEnabled();

  // It should now be clickable without error
  await activeQuickAddBtn.click();
  await page.locator('h3:has-text("Create New Task")').waitFor({ state: 'visible' });
});
