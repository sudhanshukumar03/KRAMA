import { test, expect } from '@playwright/test';

test.describe('Sidebar Layout Fullscreen Verification', () => {
  test.beforeEach(async ({ page }) => {
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
              focusWallpaper: { type: 'curated', value: '/wallpapers/lighthouse.png' },
              focusLayout: 'sidebar',
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/focus-sessions/schedule', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'manual', plan: [] }),
      });
    });

    await page.route('**/api/v1/focus-sessions/wallpaper*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ wallpapers: [] }),
      });
    });
  });

  test('In fullscreen mode, top header and mode switcher are hidden', async ({ page }) => {
    // 1. Pre-configure localStorage for sidebar layout and lighthouse wallpaper
    await page.goto('/focus');
    await page.evaluate(() => {
      localStorage.setItem('krama.focus.layout', 'sidebar');
      localStorage.setItem('krama.focus.mode', 'manual');
      localStorage.setItem('krama.focus.wallpaper', JSON.stringify({
        type: 'curated',
        value: '/wallpapers/lighthouse.png',
      }));
    });

    // 2. Reload to apply config
    await page.reload();
    await page.waitForTimeout(1000);

    // 3. Normal tab state: Top header and mode pills must be visible
    const focusTimerText = page.locator('span:has-text("Focus Timer")').first();
    await expect(focusTimerText).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Focus")').first()).toBeVisible({ timeout: 5000 });

    // Take screenshot of normal sidebar view
    await page.screenshot({ path: 'e2e/sidebar-normal-view.png' });

    // 4. Trigger Fullscreen
    await page.evaluate(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    // Wait 3.5s for the auto-hide controls timer to elapse
    await page.waitForTimeout(3500);

    // 5. Verify top header container is hidden (opacity-0 pointer-events-none)
    const headerOverlay = page.locator('[data-testid="sidebar-header-controls"]');
    await expect(headerOverlay).toHaveClass(/opacity-0/);
    await expect(headerOverlay).toHaveClass(/pointer-events-none/);

    // 6. Verify 25:00 is visible and beautifully centered
    await expect(page.locator('span:has-text("25:00")').first()).toBeVisible();

    // Take screenshot of clean fullscreen view
    await page.screenshot({ path: 'e2e/sidebar-fullscreen-clean.png' });
  });
});
