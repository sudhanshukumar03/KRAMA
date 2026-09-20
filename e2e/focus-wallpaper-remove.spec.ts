import { test, expect } from '@playwright/test';

test.describe('Focus Wallpaper Upload & Remove Verification', () => {
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
              focusWallpaper: {
                type: 'upload',
                value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop',
                thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop',
                credit: 'beach-sunset.jpg',
              },
              focusLayout: 'sidebar',
            },
          },
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

    await page.route('**/api/v1/focus-sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  });

  test('Shows uploaded wallpaper with Remove button, and clicking Remove restores default', async ({ page }) => {
    await page.goto('/focus');
    await page.evaluate(() => {
      const customWp = {
        type: 'upload',
        value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop',
        credit: 'tropical-beach.jpg',
      };
      localStorage.setItem('krama.focus.wallpaper', JSON.stringify(customWp));
      localStorage.setItem('krama.focus.custom_wallpapers', JSON.stringify([customWp]));
      localStorage.setItem('krama.focus.layout', 'sidebar');
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Press 'W' to open Wallpaper modal
    await page.keyboard.press('w');
    await page.waitForTimeout(600);

    // Modal should be open
    await expect(page.locator('text=Wallpaper & Layout')).toBeVisible();

    // The Upload tab button should exist and be active because current wallpaper is upload
    const uploadTabBtn = page.locator('button:has-text("Upload")').first();
    await expect(uploadTabBtn).toBeVisible();

    // Verify "Your Custom Wallpapers" section is present
    await expect(page.locator('text=Your Custom Wallpapers')).toBeVisible();

    // Verify Active badge
    await expect(page.locator('text=Active')).toBeVisible();

    // Verify Remove button exists
    const removeBtn = page.locator('button:has-text("Remove")').first();
    await expect(removeBtn).toBeVisible();

    // Take screenshot of Wallpaper Modal with the uploaded wallpaper & Remove button
    await page.screenshot({ path: 'e2e/wallpaper-upload-remove-ui.png' });

    // Click Remove
    await removeBtn.click();
    await page.waitForTimeout(600);

    // Toast should show
    await expect(page.locator('text=Custom wallpaper removed').first()).toBeVisible({ timeout: 5000 });

    // Custom wallpapers list should now be empty (or not showing active)
    await expect(page.locator('text=Your Custom Wallpapers')).not.toBeVisible();

    // Take screenshot after removal
    await page.screenshot({ path: 'e2e/wallpaper-after-remove.png' });
  });
});
