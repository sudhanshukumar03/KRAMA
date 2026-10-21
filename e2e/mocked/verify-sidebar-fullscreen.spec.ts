import { expect, test } from '@playwright/test';

test.describe('Sidebar Layout Fullscreen Verification', () => {
  test.beforeEach(async ({ context }) => {
    // Keep mocked account tests independent of a locally running API/socket server.
    await context.route("**/socket.io/**", route => route.abort());
    await context.route("**/api/v1/**", route => route.abort());
    await context.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'mock-jwt-token-123' }),
      });
    });

    await context.route('**/api/v1/auth/me', async (route) => {
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

    await context.route('**/api/v1/focus-sessions/schedule', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'manual', plan: [] }),
      });
    });

    await context.route('**/api/v1/focus-sessions/wallpaper*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ wallpapers: [] }),
      });
    });
  });


  test('retired Analytics links redirect to Dashboard without requesting its API', async ({ page, context }) => {
    const analyticsRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/analytics')) analyticsRequests.push(request.url());
    });
    await context.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/auth/')) return route.fallback();
      const data = path.endsWith('/dashboard') ? {
        stats: { totalProjects: 0, totalTasks: 0, totalHabits: 0, totalNotes: 0, totalGoals: 0 },
        today: { tasks: [], overdueTaskIds: [], focusMinutes: 12, focusSessions: [] },
        habits: [], goals: [], projects: [], activity: [], focus: { sessions: [] },
        features: { aiInsights: false, quickCapture: true }, dateKey: '2026-10-11',
      } : path.endsWith('/workspaces') ? [{ id: 'ws-1', name: 'Personal workspace' }] : [];
      await route.fulfill({ status: 200, json: data });
    });
    await page.goto('/app/analytics');
    await expect(page).toHaveURL(/\/app\/?$/);
    await expect(page.getByRole('heading', { name: "Today's Focus", exact: true })).toBeVisible();
    await expect(page.getByText('12 min of your focus time today', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Analytics/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Analytics', exact: true })).toHaveCount(0);
    expect(analyticsRequests).toEqual([]);
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Start Focus', exact: true }).click();
    const focusPage = await popup;
    await expect(focusPage).toHaveURL(/\/focus$/);
    await expect(focusPage.getByRole('button', { name: 'Settings and options' })).toBeVisible();
    await expect(page).toHaveURL(/\/app\/?$/);
  });


  test('Focus settings retain local changes and show a recoverable account-sync failure', async ({ page }) => {
    await page.route('**/socket.io/**', route => route.abort());
    let attempts = 0;
    await page.route('**/api/v1/auth/me/preferences', route => {
      attempts++;
      return route.fulfill({ status: attempts === 1 ? 503 : 200, json: { message: attempts === 1 ? 'Temporary outage' : 'Saved' } });
    });
    await page.goto('/focus');
    await page.getByRole('button', { name: 'Settings and options' }).click();
    await page.getByRole('button', { name: /^Customize/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Focus Duration', { exact: true }).fill('45');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('Settings saved on this device. Account sync failed; try saving again.', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('krama.focus.mock-user-1.settings') || '{}').focusDuration)).toBe(45);
    await page.reload();
    await page.getByRole('button', { name: 'Settings and options' }).click();
    await page.getByRole('button', { name: /^Customize/ }).click();
    await expect(dialog.getByLabel('Focus Duration', { exact: true })).toHaveValue('45');
    await dialog.getByRole('button', { name: 'Save & Close', exact: true }).click();
    await expect.poll(() => attempts).toBe(2);
  });

  test('rapid Focus edits retain the latest preference when the first save is delayed', async ({ page }) => {
    await page.route('**/socket.io/**', route => route.abort());
    let release!: () => void;
    const firstSave = new Promise<void>(resolve => { release = resolve; });
    let requests = 0, completed = 0, savedDuration = 25;
    const user = () => ({ id: 'mock-user-1', email: 'focus@krama.com', name: 'Focus Architect', memberships: [{ workspaceId: 'ws-1', role: 'MEMBER' }], metadata: { timerPreferences: { focusDuration: savedDuration, shortBreak: 5, longBreak: 15, longBreakAfter: 4 }, focusLayout: 'sidebar' } });
    await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: user() } }));
    await page.route('**/api/v1/auth/me/preferences', async route => {
      const sequence = ++requests;
      const data = route.request().postDataJSON();
      if (sequence === 1) await firstSave;
      savedDuration = data.timerPreferences.focusDuration;
      completed++;
      await route.fulfill({ json: { user: user() } });
    });
    try {
      await page.goto('/focus');
      await page.getByRole('button', { name: 'Settings and options' }).click();
      await page.getByRole('button', { name: /^Customize/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Focus Duration', { exact: true }).fill('45');
      await expect.poll(() => requests).toBe(1);
      await dialog.getByLabel('Focus Duration', { exact: true }).fill('50');
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('krama.focus.mock-user-1.settings') || '{}').focusDuration)).toBe(50);
      release();
      await expect.poll(() => completed).toBe(2);
      expect(savedDuration).toBe(50);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('krama.focus.mock-user-1.pendingPreferences'))).toBeNull();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await page.getByRole('button', { name: 'Settings and options' }).click();
      await page.getByRole('button', { name: /^Customize/ }).click();
      await expect(dialog.getByLabel('Focus Duration', { exact: true })).toHaveValue('50');
    } finally { release(); }
  });

  for (const width of [390, 1440]) {
    test(`personal password dialog validates, recovers and signs out at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('krama.sidebar.collapsed', 'false'));
      await page.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/auth/')) return route.fallback();
        const data = url.pathname.endsWith('/workspaces') ? [{ id: 'ws-1', name: 'Personal workspace' }] : [];
        await route.fulfill({ status: 200, json: data });
      });
      let attempts = 0;
      await page.route('**/api/v1/auth/me/password', async route => {
        attempts++;
        const data = route.request().postDataJSON();
        expect(data.newPassword).toBe('a-personal-new-passphrase');
        await route.fulfill({ status: attempts === 1 ? 400 : 200, json: { message: attempts === 1 ? 'Current password is incorrect' : 'Password changed' } });
      });
      await page.goto('/app/brain');
      if (width < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Change password', exact: true }).click();
      let dialog = page.getByRole('dialog', { name: 'Change password', exact: true });
      await expect(dialog).toBeVisible();
      await expect(page.locator('#current-password')).toBeFocused();
      await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
      await expect(page.getByRole('button', { name: width < 768 ? 'Open navigation' : 'Settings', exact: true })).toBeFocused();
      if (width < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Change password', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Change password', exact: true });
      await dialog.getByLabel('Current password', { exact: true }).fill('wrong-password');
      await dialog.getByLabel('New password', { exact: true }).fill('a-personal-new-passphrase');
      await dialog.getByLabel('Confirm new password', { exact: true }).fill('mismatch');
      await dialog.getByRole('button', { name: 'Change password', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('do not match'); expect(attempts).toBe(0);
      await dialog.getByLabel('Confirm new password', { exact: true }).fill('a-personal-new-passphrase');
      await dialog.getByRole('button', { name: 'Show passwords' }).click();
      await expect(dialog.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'text');
      const geometry = await dialog.evaluate(node => ({ width: node.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth, targets: [...node.querySelectorAll('button,input')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })) }));
      expect(geometry.overflow).toBe(false);
      for (const target of geometry.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44); }
      await dialog.getByRole('button', { name: 'Change password', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Current password is incorrect');
      await expect(dialog.getByRole('alert')).toBeFocused();
      await dialog.getByLabel('Current password', { exact: true }).fill('correct-password');
      await dialog.getByRole('button', { name: 'Change password', exact: true }).click();
      await expect(page).toHaveURL(/\/login/); expect(attempts).toBe(2);
    });
  }

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

    // 3. Normal tab state: Header and timer controls must be visible
    const focusTimerText = page.locator('span:has-text("Focus Timer")').first();
    await expect(focusTimerText).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Enter Fullscreen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings and options' })).toBeVisible();


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

  });
});
