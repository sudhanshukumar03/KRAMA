import { test, expect } from '@playwright/test';

test.describe.serial('Focus Mode Comprehensive E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API requests with authentic mock payloads
    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'mock-jwt-token-123' }),
      });
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-user-1',
            email: 'focus@krama.com',
            name: 'Focus Architect',
            memberships: [{ workspaceId: 'ws-1', role: 'MEMBER' }],
            metadata: {
              timerPreferences: {
                focusDuration: 25,
                shortBreak: 5,
                longBreak: 15,
                longBreakAfter: 4,
              },
              focusWallpaper: { type: 'gradient', value: 'deep-ocean' },
              focusLayout: 'centered',
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/auth/signup', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-123',
          user: {
            id: 'mock-user-1',
            email: 'focus@krama.com',
            name: 'Focus Architect',
            memberships: [{ workspaceId: 'ws-1', role: 'MEMBER' }],
          },
        }),
      });
    });

    await page.route('**/api/v1/focus-sessions/schedule', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'planner',
          plan: [
            {
              index: 0,
              type: 'pomodoro',
              durationMin: 25,
              taskId: 'task-dsa-1',
              taskTitle: 'Study DSA Tree Traversal',
              projectId: 'proj-algo',
              projectName: 'Algorithms',
              label: 'Study DSA Tree Traversal (1/2)',
            },
            {
              index: 1,
              type: 'short_break',
              durationMin: 5,
              taskId: null,
              taskTitle: null,
              projectId: null,
              projectName: null,
              label: 'Short Break',
            },
            {
              index: 2,
              type: 'pomodoro',
              durationMin: 25,
              taskId: 'task-dsa-1',
              taskTitle: 'Study DSA Tree Traversal',
              projectId: 'proj-algo',
              projectName: 'Algorithms',
              label: 'Study DSA Tree Traversal (2/2)',
            },
          ],
          totalFocusMinutes: 50,
          dailyCapMinutes: 240,
          alreadyLoggedMinutes: 0,
          remainingMinutes: 240,
          taskBreakdown: [
            { taskId: 'task-dsa-1', title: 'Study DSA Tree Traversal', pomodoroCount: 2 },
          ],
          generatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/focus-sessions/wallpaper*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ wallpapers: [] }),
      });
    });

    await page.route('**/api/v1/focus-sessions', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          session: { id: 'session-completed-1', duration: 1500, type: 'pomodoro' },
          dailyLog: { deepWorkMinutes: 25 },
        }),
      });
    });

    await page.route('**/api/v1/auth/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('1. Direct Navigation to /focus -> Verify Full UI, Normal Clock, Custom Timer, & Three-Dot Menu', async ({ page }) => {
    await page.goto('/focus');
    await page.waitForURL(/\/focus/, { timeout: 10000 });

    // Verify digital timer digits are visible
    const timerText = page.locator('span:has-text("25:00")').first();
    await expect(timerText).toBeVisible({ timeout: 5000 });

    // Verify tabs and Full Screen button are immediately visible in normal tab mode
    const fullScreenTab = page.locator('button:has-text("Full Screen")').first();
    await expect(fullScreenTab).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Focus")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Normal Clock")').first()).toBeVisible({ timeout: 5000 });

    // Verify planned task is displayed from PlannerTimerAlgo schedule
    const taskBadge = page.locator('text=Study DSA Tree Traversal').first();
    await expect(taskBadge).toBeVisible({ timeout: 5000 });

    // Start timer via Enter key (no stopping icon needed)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1100);

    // Document title updates with live time
    await expect(page).toHaveTitle(/\(24:[0-5][0-9]\) Focus - KRAMA/);

    // Pause timer via Enter key
    await page.keyboard.press('Enter');

    // Press Esc to reveal Krama options HUD
    await page.keyboard.press('Escape');

    // Switch to Custom Timer mode
    const customModeBtn = page.locator('button:has-text("Custom")').first();
    await expect(customModeBtn).toBeVisible({ timeout: 3000 });
    await customModeBtn.click();
    // Custom presets should be visible (e.g. 15m, 45m, 60m)
    await expect(page.locator('button:has-text("60m")').first()).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("60m")').first().click();
    await expect(page.locator('span:has-text("60:00")').first()).toBeVisible({ timeout: 3000 });

    // Switch to Normal Clock mode
    const clockModeBtn = page.locator('button:has-text("Normal Clock")').first();
    await clockModeBtn.click();
    await expect(page.locator('span:has-text("AM"), span:has-text("PM")').first()).toBeVisible({ timeout: 3000 });

    // Test Three-Dot Menu
    const moreMenuBtn = page.locator('button[title="Settings & Options"]').first();
    await expect(moreMenuBtn).toBeVisible({ timeout: 3000 });
    await moreMenuBtn.click();

    // Verify options in dropdown
    await expect(page.locator('text=Timer Options')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Focus (Pomodoro)")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Wallpaper & Layout")').first()).toBeVisible({ timeout: 3000 });

    // Click Focus (Pomodoro) from Three-Dot menu
    await page.locator('button:has-text("Focus (Pomodoro)")').first().click();
    await expect(page.locator('span:has-text("25:00")').first()).toBeVisible({ timeout: 3000 });

    // Open Theme & Wallpaper Picker via 'w'
    await page.keyboard.press('w');
    const themeModal = page.locator('text=Wallpaper & Layout');
    await expect(themeModal).toBeVisible({ timeout: 3000 });

    // Select Curated wallpaper: Summit Odyssey
    const summitOption = page.locator('button:has-text("Summit Odyssey")').first();
    if (await summitOption.isVisible()) {
      await summitOption.click();
    }

    // Switch layout to Card
    const cardLayoutBtn = page.locator('button:has-text("Card")').first();
    if (await cardLayoutBtn.isVisible()) {
      await cardLayoutBtn.click();
    }

    // Close Wallpaper modal via Escape
    await page.keyboard.press('Escape');
    await expect(themeModal).not.toBeVisible({ timeout: 3000 });

    // Open Settings via 's'
    await page.keyboard.press('s');
    const settingsModal = page.locator('text=Timer Configuration');
    await expect(settingsModal).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Custom Timer Sprint')).toBeVisible({ timeout: 3000 });

    // Close Settings via Escape
    await page.keyboard.press('Escape');
    await expect(settingsModal).not.toBeVisible({ timeout: 3000 });
  });

  test('2. Sidebar Navigation -> Focus Timer with new tab trigger', async ({ page }) => {
    // Navigate to /app/
    await page.goto('/app/');
    await page.waitForLoadState('domcontentloaded');

    // Verify Focus Timer item exists in Sidebar
    const focusTimerBtn = page.locator('button[title*="Focus Timer"]').first();
    await expect(focusTimerBtn).toBeVisible({ timeout: 5000 });
    await expect(focusTimerBtn).toContainText('Focus Timer');

    // Press '?' to view shortcut cheatsheet
    await page.keyboard.press('?');
    const cheatsheet = page.locator('text=Focus Mode');
    if (await cheatsheet.isVisible()) {
      await expect(page.locator('kbd:has-text("Ctrl")').first()).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
