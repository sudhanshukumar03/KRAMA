import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe.serial('Section 3 UI Verification', () => {
  const userPassword = 'password123';
  const userEmail = `e2e_ui_${Date.now()}@krama.com`;
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = new PrismaClient();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('UI components and Habit Sync', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('PAGE CONSOLE ERROR:', msg.text());
    });
    page.on('pageerror', exception => {
      console.log(`PAGE EXCEPTION: "${exception}"`);
    });
    page.on('response', response => {
      if (response.status() === 401 || response.status() === 500) {
        console.log(`NETWORK ERROR: ${response.status()} on ${response.url()}`);
      }
    });

    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'UI Verify User');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    const workspace = await prisma.workspace.findFirst({ where: { members: { some: { userId: user!.id } } } });

    // Inject Goal with both Habit and Project, and correct icon case
    await prisma.goal.create({
      data: {
        title: 'Ship UI Verification',
        type: 'quarterly',
        icon: 'Rocket', // Correct case for resolveIcon
        progress: 0,
        targetDate: new Date(),
        workspaceId: workspace!.id,
        createdBy: user!.id,
        updatedBy: user!.id,
        habits: {
          create: [{ name: 'Verify UI Code', workspaceId: workspace!.id, streak: 0, createdBy: user!.id, updatedBy: user!.id }]
        },
        projects: {
          create: [{ name: 'Test Project', status: 'active', workspaceId: workspace!.id, createdBy: user!.id, updatedBy: user!.id }]
        }
      }
    });

    // 2. Go to Goals
    await page.goto('/app/goals');
    await expect(page.locator('text=Ship UI Verification')).toBeVisible({ timeout: 10000 });
    
    // Screenshot 1: Goal Card showing Custom Icon, Habit Count, and Project Count
    await page.screenshot({ path: 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/goal_card_ui.png' });


    // Open Create Modal
    await page.click('text=New Goal');
    await expect(page.locator('h3', { hasText: 'Create New Goal / OKR' })).toBeVisible();
    await page.fill('input[placeholder="e.g., Ship Krama OS v1.0 Public Beta"]', 'Test Goal');

    // Screenshot 2: Modal Open
    await page.screenshot({ path: 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/goal_create_modal.png' });
    
    // Fill out the form and submit
    await page.click('button[type="submit"]', { hasText: 'Create Goal' });
    await expect(page.locator('text=Test Goal').first()).toBeVisible({ timeout: 10000 });

    // 3. Test Habit completion on Goals screen
    const habitRow = page.locator('div').filter({ hasText: 'Verify UI Code' }).first();
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/log') && res.request().method() === 'POST'),
      habitRow.locator('[data-testid="habit-checkbox"]').click() // Checkbox
    ]);
    await page.mouse.move(0, 0); // Move mouse away to remove group-hover:hidden
    
    // Wait for the mutation to settle (usually under 1s locally)
    await page.waitForTimeout(1000);
    
    // 4. Navigate to HabitTracker and verify streak synced
    await page.locator('button', { hasText: 'View 30-Day Heatmap Tracker' }).click();
    await page.waitForTimeout(1000); // Give time to render
    
    // Screenshot 3: Habit Tracker showing synced streak
    await page.screenshot({ path: 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/habit_tracker_streak.png' });
    
    const bodyHtml = await page.locator('body').innerHTML();
    console.log('BODY HTML LENGTH:', bodyHtml.length);
    console.log('BODY HTML PREVIEW:', bodyHtml.substring(0, 1500));
    const isVerifyPresent = bodyHtml.includes('Verify UI Code');
    console.log('IS VERIFY UI CODE IN HTML?', isVerifyPresent);
    
    await expect(page.getByText('1d streak')).toBeVisible({ timeout: 10000 });
  });
});
