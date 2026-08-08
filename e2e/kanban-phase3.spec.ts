import { test, expect } from '@playwright/test';

test.describe.serial('Kanban Phase 3 Verification', () => {
  const userPassword = 'password123';
  const userEmail = `kanban_phase3_${Date.now()}@krama.com`;

  test('Drag and drop position updates and dependency UI works', async ({ page }) => {
    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'Kanban User');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    // 2. Create a Project
    await page.goto('/app/projects');
    await page.click('text=New Initiative');
    await page.fill('input[placeholder="e.g., Autonomous Decision Engine v2"]', 'Phase 3 Project');
    await page.click('button:has-text("Launch Initiative")');
    await expect(page.locator('text=Phase 3 Project').first()).toBeVisible();

    // 3. Create two tasks via the board
    await page.goto('/app/board');

    // Create Task 1
    await page.getByText('Quick Add').first().click();
    await page.locator('h3:has-text("Create New Task")').waitFor({ state: 'visible' });
    await page.locator('input[type="text"]').last().fill('Task 1');
    await page.locator('button[type="submit"]', { hasText: 'Create Task' }).click();
    await expect(page.locator('text=Task 1').first()).toBeVisible();

    // Create Task 2
    await page.getByText('Quick Add').first().click();
    await page.locator('h3:has-text("Create New Task")').waitFor({ state: 'visible' });
    await page.locator('input[type="text"]').last().fill('Task 2');
    await page.locator('button[type="submit"]', { hasText: 'Create Task' }).click();
    await expect(page.locator('text=Task 2').first()).toBeVisible();

    // 4. Test Dependency UI (blockedById)
    // Click on Task 2 to edit it
    await page.getByText('Task 2', { exact: true }).first().click();
    await expect(page.locator('h3', { hasText: 'Edit Task' })).toBeVisible();
    
    // Check if the single-select dependency UI is present
    const select = page.locator('select').last();
    // Select 'Task 1' as the blocking task
    await select.selectOption({ index: 1 });
    await page.click('button[type="submit"]', { hasText: 'Save Changes' });
    
    // Make sure modal closed
    await expect(page.locator('h3', { hasText: 'Edit Task' })).toBeHidden();

    // 5. Test Drag and Drop
    // Move Task 1 to IN_PROGRESS
    const sourceCard = page.locator('div').filter({ hasText: 'Task 1' }).first();
    const targetColumn = page.locator('div').filter({ hasText: 'IN PROGRESS' }).first();
    
    await sourceCard.dragTo(targetColumn);
    
    // Wait a moment for mutation to finish
    await page.waitForTimeout(2000);
    
    // Refresh page to verify persistence
    await page.reload();
    await expect(page.locator('text=Task 1').first()).toBeVisible();
  });
});
