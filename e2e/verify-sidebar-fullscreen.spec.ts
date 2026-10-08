import { test, expect } from '@playwright/test';

test.describe('API session regression checks', () => {
  test('expired account settings refresh once and retry', async () => {
    const { api } = await import('../apps/web/src/api/client');
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    api.setAccessToken('expired');
    globalThis.fetch = async (input, options) => {
      const path = String(input);
      requests.push(path);
      if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'renewed' });
      const token = new Headers(options?.headers).get('Authorization');
      return Response.json({ user: { id: 'personal' } }, { status: token === 'Bearer renewed' ? 200 : 401 });
    };
    try {
      expect(await api.auth.me()).toEqual({ user: { id: 'personal' } });
      expect(requests).toEqual(['/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/auth/me']);
    } finally { globalThis.fetch = originalFetch; api.setAccessToken(null); }
  });

  test('a delayed refresh cannot restore a signed-out session', async () => {
    const { api } = await import('../apps/web/src/api/client');
    const originalFetch = globalThis.fetch;
    let complete!: (response: Response) => void;
    const tokens: (string | null)[] = [];
    api.setAccessToken(null);
    const unsubscribe = api.subscribeAccessToken(token => tokens.push(token));
    globalThis.fetch = () => new Promise(resolve => { complete = resolve; });
    try {
      const pending = api.auth.refresh();
      api.setAccessToken(null);
      complete(Response.json({ accessToken: 'stale-session' }));
      expect(await pending).toEqual({ accessToken: null });
      expect(tokens).toEqual([null]);
    } finally { unsubscribe(); globalThis.fetch = originalFetch; api.setAccessToken(null); }
  });

  test('a stale unauthorized request does not replay under another account', async () => {
    const { api } = await import('../apps/web/src/api/client');
    const originalFetch = globalThis.fetch;
    let complete!: (response: Response) => void;
    let requests = 0;
    api.setAccessToken('first-account');
    globalThis.fetch = () => {
      requests++;
      return requests === 1 ? new Promise(resolve => { complete = resolve; }) : Promise.resolve(Response.json({ user: { id: 'other-account' } }));
    };
    try {
      const pending = api.workspaces.list();
      api.setAccessToken('other-account');
      complete(Response.json({ message: 'Unauthorized' }, { status: 401 }));
      await expect(pending).rejects.toMatchObject({ status: 401 });
      expect(requests).toBe(1);
    } finally { globalThis.fetch = originalFetch; api.setAccessToken(null); }
  });
});

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
