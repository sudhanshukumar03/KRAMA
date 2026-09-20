import { test, expect } from '@playwright/test';

test.describe('Dashboard UI & Functionality Verification', () => {
  const userPassword = 'password123';
  const userEmail = `dashboard_test_${Date.now()}@krama.com`;

  test('Dashboard loads, renders clean cockpit, and Quick Capture triggers correctly', async ({ page }) => {
    // 1. Signup to land on Dashboard
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'Cockpit User');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/app/);

    // 2. Verify clean Dashboard header and widgets
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Today\'s Focus').first()).toBeVisible();
    await expect(page.locator('text=Active Projects').first()).toBeVisible();
    await expect(page.locator('text=Habits Today').first()).toBeVisible();
    await expect(page.locator('text=Recent Activity').first()).toBeVisible();

    // 3. Verify Quick Capture sidebar card
    await expect(page.locator('text=Quick Capture').first()).toBeVisible();
    await expect(page.locator('text=Due Today').first()).toBeVisible();

    // 4. Test Quick Capture buttons: Task
    const taskBtn = page.locator('button:has-text("Task")').first();
    await taskBtn.click();
    await expect(page.locator('button:has-text("Task")[class*="bg-"]').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('button[aria-label="Close modal"]')).not.toBeVisible({ timeout: 3000 });

    // 5. Test Quick Capture buttons: Idea
    const ideaBtn = page.locator('button:has-text("Idea")').first();
    await ideaBtn.click();
    await expect(page.locator('button:has-text("Idea")[class*="bg-"]').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('button[aria-label="Close modal"]')).not.toBeVisible({ timeout: 3000 });

    // 6. Test Quick Capture buttons: Link
    const linkBtn = page.locator('button:has-text("Link")').first();
    await linkBtn.click();
    await expect(page.locator('button:has-text("Link")[class*="bg-"]').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('button[aria-label="Close modal"]')).not.toBeVisible({ timeout: 3000 });

    // 7. Test Quick Capture buttons: Note
    const noteBtn = page.locator('button:has-text("Note")').first();
    await noteBtn.click();
    await expect(page.locator('button:has-text("Note")[class*="bg-"]').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('button[aria-label="Close modal"]')).not.toBeVisible({ timeout: 3000 });

    // Capture screenshot for visual confirmation
    await page.screenshot({ path: 'e2e/dashboard-verified.png', fullPage: true });
  });
});
