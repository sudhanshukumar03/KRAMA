import { test, expect, type Page } from '@playwright/test';
import { applyLocalRepulsion } from '../apps/web/src/lib/graphLayout';

const doc = { id: 'doc-1', title: 'Architecture notes', type: 'DOCUMENT', spaceId: 'space-1', parentId: null, tags: [], contentJson: { type: 'doc', content: [{ type: 'paragraph' }] }, updatedAt: '2026-10-06T00:00:00Z', createdAt: '2026-10-06T00:00:00Z' };
async function mockApi(page: Page, authed = true, memberships = [{ workspaceId: 'ws-1', role: 'OWNER', workspace: { id: 'ws-1', name: 'Test workspace' } }]) {
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/auth/refresh') return route.fulfill({ status: authed ? 200 : 401, json: { accessToken: 'ui-test-token' } });
    if (path === '/auth/me') data = { user: { id: 'user-1', name: 'UI Tester', email: 'ui@example.com', memberships } };
    else if (path === '/documents') data = { items: url.searchParams.has('deleted') ? [] : [{ id: doc.id, title: doc.title, documentType: doc.type, spaceId: doc.spaceId, parentId: doc.parentId, projectId: null, tags: doc.tags, isFavorite: false, statusBadges: [], createdAt: doc.createdAt, updatedAt: doc.updatedAt }], nextCursor: null };
    else if (path === '/documents/doc-1') data = doc;
    else if (path.endsWith('/links')) data = { incoming: [], outgoing: [] };
    else if (path.endsWith('/graph')) data = { nodes: [doc, { id: 'doc-2', type: 'DOCUMENT', title: 'Release checklist' }], links: [{ sourceId: 'doc-1', targetId: 'doc-2', linkType: 'REFERENCE' }] };
    else if (path === '/spaces') data = [{ id: 'space-1', name: 'Engineering' }];
    else if (path === '/workspaces') data = [{ id: 'ws-1', name: 'Test workspace' }];
    else if (path === '/dashboard') data = {};
    return route.fulfill({ json: data });
  });
}

test('authenticated users without a live workspace receive guidance and can sign out', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('krama_active_workspace', 'deleted-workspace'));
  await mockApi(page, true, []);
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'No active workspace' })).toBeVisible();
  await expect(page.getByText(/ask a workspace owner to invite you/i)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'No active workspace' })).not.toBeVisible();
});

test('auth labels, password rule, and accessible server errors', async ({ page }) => {
  await mockApi(page, false);
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill('Tester');
  await page.getByLabel('Email', { exact: true }).fill('tester@example.com');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('minlength', '8');
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
  await page.route('**/auth/signup', route => route.fulfill({ status: 400, json: { message: 'Validation failed', errors: [{ message: 'Password must be at least 8 characters long' }] } }));
  await page.getByLabel('Password', { exact: true }).fill('abcdefgh');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Password must be at least 8 characters long');
});

for (const theme of ['light', 'dark']) {
  test(`primary contrast and mobile auth layout: ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(value => localStorage.setItem('krama-theme', value), theme);
    await mockApi(page, false);
  await page.goto('/login');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('placeholder', '••••••••');
    const button = page.getByRole('button', { name: 'Sign In', exact: true });
    for (const hover of [false, true]) {
      if (hover) await button.hover();
      await expect.poll(async () => button.evaluate(element => {
        const style = getComputedStyle(element);
        const ctx = document.createElement('canvas').getContext('2d')!;
        const luminance = (color: string) => {
          ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
          const rgba = ctx.getImageData(0, 0, 1, 1).data;
          const rgb = Array.from(rgba).slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
          return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        };
        const a = luminance(style.color), b = luminance(style.backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      })).toBeGreaterThanOrEqual(4.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`auth-${theme}.png`) });
  });
}

test('Kanban dialog traps focus and Escape restores trigger', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.goto('/app/board');
  const trigger = page.getByRole('button', { name: 'New Directive', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Create New Directive' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Directive Title', { exact: false }).fill('Accessible task');
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
  }
  await page.screenshot({ path: testInfo.outputPath('kanban-dialog.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('mobile Brain switches between list and usable editor', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto('/app/brain');
  await page.getByText('Architecture notes', { exact: true }).first().click();
  await expect(page.getByRole('navigation', { name: 'Document view' }).getByRole('button', { name: 'Editor', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const editor = page.locator('.tiptap').first();
  await expect(editor).toBeVisible();
  expect((await editor.boundingBox())!.width).toBeGreaterThan(250);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  if (!process.env.UI_CHECK_NO_SCREENSHOTS) await page.screenshot({ path: testInfo.outputPath('brain-mobile.png') });
  await page.setViewportSize({ width: 320, height: 740 });
  const narrowEditor = (await editor.boundingBox())!;
  // The document surface keeps its existing gutters; assert usable content
  // width and containment rather than a desktop-sized minimum at 320px.
  expect(narrowEditor.width).toBeGreaterThan(320 * .7);
  expect(narrowEditor.x).toBeGreaterThanOrEqual(0);
  expect(narrowEditor.x + narrowEditor.width).toBeLessThanOrEqual(320);
  await page.getByRole('navigation', { name: 'Document view' }).getByRole('button', { name: 'Documents', exact: true }).click();
  await expect(editor).not.toBeVisible();
});

test('graph exposes searchable keyboard relationships and reduced-motion static view', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page);
  await page.goto('/app/brain');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const frames = await canvas.evaluate(async (element: HTMLCanvasElement) => {
    await new Promise(requestAnimationFrame);
    const first = element.toDataURL();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return [first, element.toDataURL()];
  });
  expect(frames[0]).toBe(frames[1]);
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('graph-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('graph-mobile.png') });
  await page.getByRole('button', { name: 'Nodes and links', exact: true }).click();
  const list = page.getByRole('region', { name: 'Graph nodes and relationships' });
  await expect(list).toContainText('Outgoing reference');
  await expect(list).toContainText('Incoming reference');
  await page.getByRole('textbox', { name: 'Filter graph nodes' }).fill('Architecture');
  await expect(list.getByRole('button', { name: 'Release checklist', exact: true })).toBeVisible();
  await list.getByRole('button', { name: 'Architecture notes (DOCUMENT)', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tiptap').first()).toBeVisible();
});

test('spatial repulsion matches original forces and benchmark', () => {
  const fixture = (n: number) => Array.from({ length: n }, (_, i) => ({ x: (i % 40) * 85 - 1000, y: Math.floor(i / 40) * 85 - 900, vx: 0, vy: 0 }));
  const original = (nodes: ReturnType<typeof fixture>) => {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 180) { const force = (180 - dist) / dist * .4; nodes[i].vx -= dx * force; nodes[i].vy -= dy * force; nodes[j].vx += dx * force; nodes[j].vy += dy * force; }
    }
  };
  const a = fixture(1000), b = fixture(1000);
  original(a); applyLocalRepulsion(b);
  for (let i = 0; i < a.length; i++) { expect(b[i].vx).toBeCloseTo(a[i].vx, 8); expect(b[i].vy).toBeCloseTo(a[i].vy, 8); }
  const measure = (fn: typeof original) => { const data = fixture(1000); for (let i = 0; i < 10; i++) fn(data); const start = performance.now(); for (let i = 0; i < 50; i++) fn(data); return (performance.now() - start) / 50; };
  console.log({ originalMs: measure(original), spatialMs: measure(applyLocalRepulsion) });
});
