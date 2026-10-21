import { expect, test, type Page } from '@playwright/test';

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
  await expect(page.getByText(/Use at least 8 characters and no more than 72 UTF-8 bytes/)).toBeVisible();
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
  const trigger = page.getByRole('button', { name: 'New Task', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Create New Task' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Task Title', { exact: false }).fill('Accessible task');
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



const aspirationFixture = {
  id: 'goal-layout', title: 'Build a consistent training routine', type: 'quarterly',
  icon: 'Target', progress: 25, version: 3, parentGoalId: null, childGoals: [],
  targetDate: '2027-01-10T00:00:00Z', createdAt: '2026-10-10T00:00:00Z',
  metadata: { category: 'health', status: 'ACTIVE', progressMode: 'manual', description: 'Keep this existing description', customField: 'preserved' },
};
async function mockAspirationApi(page: Page, existing = false) {
  await mockApi(page);
  const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
  await page.route(/\/api\/v1\/(goals|projects|habits)(?:\/[^?]+)?(?:\?.*)?$/, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') {
      const data = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path, data });
      return route.fulfill({ json: { ...aspirationFixture, ...data, id: path === '/goals' ? 'new-goal' : path.split('/').at(-1) } });
    }
    let data: unknown = [];
    if (path === '/goals') data = existing ? [aspirationFixture] : [];
    else if (path === '/goals/goal-layout') data = aspirationFixture;
    else if (path === '/projects') data = Array.from({ length: 8 }, (_, i) => ({ id: 'project-' + i, name: i === 0 ? 'Strength training' : 'Supporting project ' + i, version: 1, goalId: existing && i === 0 ? aspirationFixture.id : null, tasks: [] }));
    else if (path === '/habits') data = Array.from({ length: 8 }, (_, i) => ({ id: 'habit-' + i, name: i === 0 ? 'Morning movement' : 'Daily practice ' + i, version: 1, linkedGoalId: existing && i === 0 ? aspirationFixture.id : null, completions: [] }));
    return route.fulfill({ json: data });
  });
  return writes;
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1366, height: 600 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    test('aspiration dialog keeps actions visible: ' + theme + ' ' + viewport.width, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(value => localStorage.setItem('krama-theme', value), theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockAspirationApi(page);
      await page.goto('/app/goals');
      const trigger = page.getByRole('button', { name: 'New Goal', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'New Goal' });
      const body = dialog.locator('[data-goal-form-body]');
      const submit = dialog.getByRole('button', { name: 'Create Goal', exact: true });
      await expect(dialog).toBeVisible();
      await expect(submit).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Health', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const expectContained = async () => {
        const panel = (await dialog.boundingBox())!;
        const action = (await submit.boundingBox())!;
        const heading = (await dialog.getByRole('heading', { name: 'New Goal' }).boundingBox())!;
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);
        expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
        expect(action.y + action.height).toBeLessThanOrEqual(panel.y + panel.height);
        expect(heading.y).toBeGreaterThanOrEqual(panel.y);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
      };
      await expectContained();
      await dialog.getByLabel('Goal Title', { exact: false }).fill('Train consistently');
      await dialog.getByRole('button', { name: 'Pick an icon' }).click();
      const iconSearch = dialog.getByPlaceholder('Search icons...');
      await expect(iconSearch).toBeVisible();
      const picker = (await iconSearch.locator('..').locator('..').boundingBox())!;
      expect(picker.x).toBeGreaterThanOrEqual(0);
      expect(picker.x + picker.width).toBeLessThanOrEqual(viewport.width);
      const scrollArea = (await body.boundingBox())!;
      expect(picker.y + picker.height).toBeLessThanOrEqual(scrollArea.y + scrollArea.height);
      await iconSearch.fill('Heart');
      await dialog.getByRole('button', { name: 'Heart', exact: true }).click();
      await dialog.getByText('Advanced goal options', { exact: true }).click();
      await dialog.getByRole('checkbox', { name: 'Track Numeric Metric', exact: false }).check();
      await dialog.getByLabel('Current value', { exact: true }).fill('3');
      await dialog.getByLabel('Target value', { exact: true }).fill('12');
      await dialog.getByLabel('Unit', { exact: true }).fill('sessions');
      await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await expectContained();
      expect(await body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      if (!process.env.UI_CHECK_NO_SCREENSHOTS && viewport.width === 1440) await page.screenshot({ path: testInfo.outputPath('aspiration-connections-' + theme + '.png') });
      await dialog.getByRole('checkbox', { name: 'Morning movement', exact: true }).check();
      const position = (await submit.boundingBox())!;
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
      }
      expect((await submit.boundingBox())!.y).toBe(position.y);
      await body.evaluate(element => { element.scrollTop = 0; });
      await expectContained();
      if (!process.env.UI_CHECK_NO_SCREENSHOTS) await page.screenshot({ path: testInfo.outputPath('aspiration-' + theme + '-' + viewport.width + '.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
  }
}

test('aspiration form preserves failed drafts, blocks duplicate saves and links selected work', async ({ page }) => {
  const writes = await mockAspirationApi(page);
  let attempts = 0;
  let releaseSave = () => {};
  await page.route('**/api/v1/goals', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts++;
    const data = route.request().postDataJSON();
    writes.push({ path: '/goals', data });
    if (attempts === 1) return route.fulfill({ status: 500, json: { message: 'Try again' } });
    await new Promise<void>(resolve => { releaseSave = resolve; });
    return route.fulfill({ json: { ...aspirationFixture, ...data, id: 'new-goal' } });
  });
  await page.goto('/app/goals');
  await page.getByRole('button', { name: 'New Goal', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New Goal' });
  await dialog.getByLabel('Goal Title', { exact: false }).fill('  Train consistently  ');
  await dialog.getByLabel('Why this matters').fill('More energy every day');
  await dialog.getByLabel('Goal horizon').selectOption('monthly');
  await dialog.getByLabel('Target date').fill('2026-11-12');
  await dialog.getByText('Advanced goal options', { exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Track Numeric Metric', exact: false }).check();
  await dialog.getByLabel('Current value').fill('3');
  await dialog.getByLabel('Target value', { exact: true }).fill('12');
  await dialog.getByLabel('Unit', { exact: true }).fill('sessions');
  await dialog.getByRole('checkbox', { name: 'Pin to Focus Spotlight' }).check();
  await dialog.getByRole('checkbox', { name: 'Strength training', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Morning movement', exact: true }).check();
  await dialog.getByRole('button', { name: 'Create Goal' }).click();
  await expect(page.getByText('Failed to create goal', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Goal Title', { exact: false })).toHaveValue('  Train consistently  ');
  // Dismiss the error toast before retrying the footer action it can overlap.
  await page.getByRole('button', { name: 'Close toast', exact: true }).click();
  await dialog.getByRole('button', { name: 'Create Goal' }).click();
  await expect(dialog.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Goal Title', { exact: false }).press('Enter');
  expect(attempts).toBe(2);
  releaseSave();
  await expect(dialog).not.toBeVisible();
  expect(writes.filter(write => write.path === '/goals')[1].data).toMatchObject({
    title: 'Train consistently', type: 'monthly', progress: 25, parentGoalId: null,
    targetDate: '2026-11-12T00:00:00.000Z',
    metadata: { category: 'health', whyStatement: 'More energy every day', progressMode: 'manual', measurable: true, currentValue: 3, targetValue: 12, unit: 'sessions', isPinned: true },
  });
  expect(writes).toEqual(expect.arrayContaining([
    { path: '/projects/project-0', data: { goalId: 'new-goal', version: 1 } },
    { path: '/habits/habit-0', data: { linkedGoalId: 'new-goal', version: 1 } },
  ]));
});

test('parent aspiration editing explains its derived progress and disables alternate sources', async ({ page }) => {
  await mockAspirationApi(page, true);
  const parent = { ...aspirationFixture, metadata: { ...aspirationFixture.metadata, progressMode: 'auto' }, childGoals: [{ ...aspirationFixture, id: 'kr', title: 'Train twelve times', parentGoalId: aspirationFixture.id }] };
  await page.route('**/api/v1/goals**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/goal-layout') ? parent : [parent] }));
  await page.goto('/app/goals');
  await page.getByRole('button', { name: 'Options for ' + aspirationFixture.title }).click();
  await page.getByRole('button', { name: 'Edit Goal', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Goal', exact: true });
  await expect(dialog.getByRole('radio', { name: 'Manual', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('radio', { name: 'Auto from Tasks', exact: true })).toBeDisabled();
  await expect(dialog.getByText(/Progress is calculated from the weighted key results/)).toBeVisible();
  await expect(dialog.getByRole('slider')).toHaveCount(0);
  await expect(dialog.getByRole('checkbox', { name: 'Track Numeric Metric', exact: false })).toHaveCount(0);
});

test('aspiration edit retains metadata and existing links; key results retain their parent', async ({ page }) => {
  const writes = await mockAspirationApi(page, true);
  await page.goto('/app/goals');
  await page.getByRole('button', { name: 'Options for ' + aspirationFixture.title }).click();
  await page.getByRole('button', { name: 'Edit Goal', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit Goal', exact: true });
  await expect(edit.getByRole('checkbox', { name: 'Strength training', exact: true })).toBeChecked();
  await expect(edit.getByRole('checkbox', { name: 'Morning movement', exact: true })).toBeChecked();
  await edit.getByLabel('Goal Title', { exact: false }).fill('A stronger routine');
  await edit.getByRole('button', { name: 'Save Changes' }).click();
  await expect(edit).not.toBeVisible();
  expect(writes.find(write => write.path === '/goals/goal-layout')?.data).toMatchObject({
    title: 'A stronger routine', version: 3, metadata: { customField: 'preserved', description: 'Keep this existing description' },
  });
  expect(writes.filter(write => /\/(projects|habits)\//.test(write.path))).toHaveLength(0);
  await page.getByRole('button', { name: 'Options for ' + aspirationFixture.title }).click();
  await page.getByRole('button', { name: 'Add Key Result', exact: true }).click();
  const child = page.getByRole('dialog', { name: 'Add Key Result / Milestone' });
  await expect(child).toContainText('Under: ' + aspirationFixture.title);
  await expect(child.getByRole('group', { name: 'Life pillar', exact: true })).toHaveCount(0);
  await child.getByLabel('Key Result Title', { exact: false }).fill('Complete twelve sessions');
  await child.getByLabel('Weight', { exact: true }).fill('3');
  await child.getByRole('button', { name: 'Add Key Result', exact: true }).click();
  await expect(child).not.toBeVisible();
  expect(writes.find(write => write.path === '/goals')?.data).toMatchObject({
    parentGoalId: aspirationFixture.id, metadata: { weight: 3 },
  });
});


const initiativeFixture = {
  id: 'initiative-layout', name: 'Krama workspace release', problemStatement: 'Build a calmer personal workspace.',
  status: 'active', progress: 0, icon: 'FolderKanban', goalId: 'goal-layout', version: 7,
  targetDate: '2026-12-10T00:00:00.000Z', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z',
  metadata: { tags: ['personal'], customField: 'preserved' }, tasks: [], milestones: [],
};
async function mockInitiativeApi(page: Page) {
  await mockApi(page);
  const state = { project: { ...initiativeFixture }, writes: [] as Array<{ method: string; data: Record<string, unknown> }> };
  await page.route(/\/api\/v1\/(projects|goals)(?:\/[^?]+)?(?:\?.*)?$/, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() === 'GET') {
      const data = path.startsWith('/goals') ? [aspirationFixture, { ...aspirationFixture, id: 'goal-next', title: 'Publish the workspace release' }] :
        path === '/projects' ? [state.project] : state.project;
      return route.fulfill({ json: data });
    }
    const data = request.postDataJSON() as Record<string, unknown>;
    state.writes.push({ method: request.method(), data });
    if (request.method() === 'PATCH' && data.version !== state.project.version) {
      return route.fulfill({ status: 409, json: { message: 'Project changed elsewhere' } });
    }
    state.project = { ...state.project, ...data, version: state.project.version + 1 };
    return route.fulfill({ json: state.project });
  });
  return state;
}

for (const editing of [true, false]) {
  for (const view of [
    { theme: 'light', width: 1366, height: 600 },
    { theme: 'dark', width: 1440, height: 900 },
    { theme: 'light', width: 320, height: 640 },
    { theme: 'dark', width: 390, height: 844 },
  ]) {
    test('initiative dialog layout: ' + (editing ? 'edit' : 'create') + ' ' + view.theme + ' ' + view.width, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.addInitScript(theme => localStorage.setItem('krama-theme', theme), view.theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockInitiativeApi(page);
      await page.goto(editing ? '/app/projects/initiative-layout' : '/app/projects');
      const trigger = page.getByRole('button', { name: editing ? 'Edit Project' : 'New Project', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: editing ? 'Edit Project Settings' : 'New Project', exact: true });
      const body = dialog.locator('[data-project-form-body]');
      const action = dialog.getByRole('button', { name: editing ? 'Save Project' : 'Create Project', exact: true });
      await expect(dialog).toBeVisible();
      const checkBounds = async () => {
        const panel = (await dialog.boundingBox())!;
        const button = (await action.boundingBox())!;
        const heading = (await dialog.getByRole('heading', { level: 2 }).boundingBox())!;
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(view.width);
        expect(panel.y + panel.height).toBeLessThanOrEqual(view.height);
        expect(button.y + button.height).toBeLessThanOrEqual(panel.y + panel.height);
        expect(heading.y).toBeGreaterThanOrEqual(panel.y);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
      };
      await checkBounds();
      await dialog.getByLabel('Project Name', { exact: true }).fill('Workspace release');
      await dialog.getByRole('button', { name: 'Pick an icon' }).click();
      const search = dialog.getByPlaceholder('Search icons...');
      const chooser = (await search.locator('..').locator('..').boundingBox())!;
      const scrollArea = (await body.boundingBox())!;
      expect(chooser.x).toBeGreaterThanOrEqual(0);
      expect(chooser.x + chooser.width).toBeLessThanOrEqual(view.width);
      expect(chooser.y + chooser.height).toBeLessThanOrEqual(scrollArea.y + scrollArea.height);
      await search.fill('Target');
      await dialog.getByRole('button', { name: 'Target', exact: true }).click();
      const scope = dialog.getByLabel('Problem Statement / Technical Scope');
      await scope.fill('Describe a useful outcome and the work needed to deliver it.');
      // A resized description must expand the scrolling body, not push actions off screen.
      await scope.evaluate(element => { element.style.height = '600px'; });
      const footerPosition = (await action.boundingBox())!.y;
      await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await checkBounds();
      expect(await body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      expect((await action.boundingBox())!.y).toBe(footerPosition);
      await scope.evaluate(element => { element.style.height = ''; });
      await body.evaluate(element => { element.scrollTop = 0; });
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
      }
      await body.evaluate(element => { element.scrollTop = 0; });
      if (!process.env.UI_CHECK_NO_SCREENSHOTS) await page.screenshot({ path: testInfo.outputPath('initiative-' + view.theme + '-' + view.width + '.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
  }
}

test('initiative editing preserves stale drafts and recovers without overwriting remote changes', async ({ page }) => {
  const state = await mockInitiativeApi(page);
  await page.goto('/app/projects/initiative-layout');
  await page.getByRole('button', { name: 'Edit Project', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Project Settings' });
  await expect(dialog.getByLabel('Strategic OKR / Linked Goal')).toHaveValue('goal-layout');
  await expect(dialog.getByLabel('Target Date', { exact: true })).toHaveValue('2026-12-10');
  await dialog.getByLabel('Project Name', { exact: true }).fill('Preserved draft');
  state.project = { ...state.project, version: 8, problemStatement: 'Scope updated remotely' };
  const refresh = page.waitForResponse(response => response.url().endsWith('/api/v1/projects/initiative-layout') && response.request().method() === 'GET');
  await dialog.getByRole('button', { name: 'Save Project', exact: true }).click();
  await refresh;
  await expect(dialog.getByRole('alert')).toContainText('This project changed elsewhere');
  await expect(dialog.getByLabel('Project Name', { exact: true })).toHaveValue('Preserved draft');
  await expect(page.getByText('Project changed elsewhere', { exact: true })).toBeVisible();
  expect(state.writes[0].data.version).toBe(7);
  expect(state.project.problemStatement).toBe('Scope updated remotely');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Edit Project', exact: true }).click();
  await expect(dialog.getByLabel('Problem Statement / Technical Scope')).toHaveValue('Scope updated remotely');
  await dialog.getByLabel('Project Name', { exact: true }).fill('  Refined initiative  ');
  await dialog.getByLabel('Status', { exact: true }).selectOption('paused');
  await dialog.getByLabel('Target Date', { exact: true }).fill('');
  await dialog.getByLabel('Strategic OKR / Linked Goal').selectOption('');
  await dialog.getByRole('button', { name: 'Save Project', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes[1].data).toMatchObject({
    name: 'Refined initiative', problemStatement: 'Scope updated remotely', status: 'paused',
    targetDate: null, goalId: null, version: 8, metadata: { tags: ['personal'], customField: 'preserved' },
  });
});

test('initiative creation retains a failed draft, prevents duplicate submissions and resets cancelled drafts', async ({ page }) => {
  await mockInitiativeApi(page);
  let attempts = 0;
  let releaseSave = () => {};
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/projects', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts++;
    const data = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(data);
    if (attempts === 1) return route.fulfill({ status: 500, json: { message: 'Unavailable' } });
    await new Promise<void>(resolve => { releaseSave = resolve; });
    return route.fulfill({ json: { ...initiativeFixture, ...data } });
  });
  await page.goto('/app/projects');
  const trigger = page.getByRole('button', { name: 'New Project', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'New Project', exact: true });
  const launch = dialog.getByRole('button', { name: 'Create Project', exact: true });
  await expect(launch).toBeDisabled();
  await dialog.getByLabel('Project Name', { exact: true }).fill('Cancelled draft');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await trigger.click();
  await expect(dialog.getByLabel('Project Name', { exact: true })).toHaveValue('');
  await dialog.getByLabel('Project Name', { exact: true }).fill('  Workspace launch  ');
  await dialog.getByLabel('Problem Statement / Technical Scope').fill('  Build a focused workspace  ');
  await dialog.getByLabel('Linked Strategic Goal / OKR').selectOption('goal-next');
  await dialog.getByLabel('Status', { exact: true }).selectOption('idea');
  await dialog.getByLabel('Target Date', { exact: true }).fill('2026-12-15');
  await launch.click();
  await expect(page.getByText('Failed to initialize project', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Project Name', { exact: true })).toHaveValue('  Workspace launch  ');
  await launch.click();
  await expect(dialog.getByRole('button', { name: 'Creating...', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Project Name', { exact: true }).press('Enter');
  expect(attempts).toBe(2);
  releaseSave();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/app\/projects\/initiative-layout$/);
  expect(writes[1]).toMatchObject({
    name: 'Workspace launch', problemStatement: 'Build a focused workspace', status: 'idea',
    goalId: 'goal-next', targetDate: '2026-12-15T00:00:00.000Z', icon: 'FolderKanban', progress: 0,
  });
});
