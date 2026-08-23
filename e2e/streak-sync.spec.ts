import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe.serial('Streak Synchronization Test', () => {
  const userPassword = 'password123';
  const userEmail = `streak_test_${Date.now()}@krama.com`;
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = new PrismaClient();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Habit Completion propagates streak automatically', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'Streak Verify User');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    const workspace = await prisma.workspace.findFirst({ where: { members: { some: { userId: user!.id } } } });

    // Inject Goal and Habit
    await prisma.goal.create({
      data: {
        title: 'Sync Verification Goal',
        type: 'quarterly',
        icon: 'Rocket',
        progress: 0,
        targetDate: new Date(),
        workspaceId: workspace!.id,
        createdBy: user!.id,
        updatedBy: user!.id,
        habits: {
          create: [{ name: 'Verify UI Code', workspaceId: workspace!.id, streak: 0, createdBy: user!.id, updatedBy: user!.id }]
        }
      }
    });

    // Step 1: Open /app/goals
    await page.goto('/app/goals');
    
    // Step 2: Note the streak shown on "Verify UI Code"
    const habitRow = page.locator('div').filter({ hasText: 'Verify UI Code' }).first();
    await expect(habitRow).toBeVisible({ timeout: 10000 });
    
    // Verify it initially shows "0d"
    await expect(habitRow.locator('text=0d')).toBeVisible();

    // Step 3: Click its checkbox in the Habits Overview panel
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/log') && res.request().method() === 'POST'),
      habitRow.locator('[data-testid="habit-checkbox"]').click() // Click the completion checkbox
    ]);
    
    console.log('Log habit response status:', response.status());
    await page.mouse.move(0, 0); // Move mouse away to remove group-hover:hidden on the streak text

    // Step 4: Note whether the streak number updates on that same screen
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/after_click.png' });
    await expect(habitRow.locator('text=1d')).toBeVisible({ timeout: 5000 });
    // Step 5: Navigate to /app/habits
    await page.locator('button', { hasText: 'View 30-Day Heatmap Tracker' }).click();
    await expect(page).toHaveURL(/\/app\/habits/);

    // Step 6: Check whether that same habit shows the same updated streak there, without a manual refresh
    await page.waitForTimeout(2000); // Give React Query time to render the new page
    let textContent = await page.locator('div').filter({ hasText: 'Verify UI Code' }).first().textContent();
    console.log('TRACKER ROW TEXT CONTENT AFTER TICK:', textContent);
    await expect(page.getByText('1d streak')).toBeVisible({ timeout: 10000 });

    // Step 7: Untick it!
    const targetRow = page.locator('div').filter({ hasText: 'Verify UI Code' }).first();
    const [untickResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/log') && res.request().method() === 'DELETE', { timeout: 10000 }),
      targetRow.locator('[data-testid="habit-checkbox"]').click()
    ]);
    console.log('Log habit untick response status:', untickResponse.status());
    await page.waitForTimeout(2000);
    textContent = await targetRow.textContent();
    console.log('TRACKER ROW TEXT CONTENT AFTER UNTICK:', textContent);
    await expect(page.getByText('0d streak')).toBeVisible({ timeout: 10000 });
  });
});
