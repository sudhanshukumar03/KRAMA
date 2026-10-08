import { test, expect, type Page } from '@playwright/test';
import { DocumentSaveQueue, acquireDocumentSaveQueue, retainDocumentSaveQueue } from '../apps/web/src/lib/documentSaveQueue';

const content = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const initial = { content: content('Original body'), title: 'Architecture notes', revision: '2026-10-06T00:00:00.000Z' };
const original = { id: 'doc-1', title: initial.title, spaceId: 'space-1', parentId: null, tags: [], contentJson: initial.content, updatedAt: initial.revision, createdAt: initial.revision };
function storage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) || null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } as Storage;
}
async function mockApi(page: Page) {
  await page.route('**/socket.io/**', r => r.abort());
  await page.route('**/api/v1/**', r => {
    const url = new URL(r.request().url());
    const path = url.pathname.replace('/api/v1', '');
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'mock-token' };
    else if (path === '/auth/me') data = { user: { id: 'user-1', name: 'Tester', email: 'test@example.com', memberships: [{ workspaceId: 'ws-1', role: 'OWNER', workspace: { id: 'ws-1', name: 'Test' } }] } };
    else if (path === '/documents') data = { items: url.searchParams.has('deleted') ? [] : [original, { ...original, id: 'doc-2', title: 'Release checklist' }].map(({ contentJson: _content, ...metadata }) => metadata), nextCursor: null };
    else if (path === '/spaces') data = [{ id: 'space-1', name: 'Engineering' }];
    else if (path === '/workspaces') data = [{ id: 'ws-1', name: 'Test' }];
    else if (path.endsWith('/links')) data = { incoming: [], outgoing: [] };
    else if (path === '/documents/doc-1') data = original;
    else if (path === '/documents/doc-2') data = { ...original, id: 'doc-2', title: 'Release checklist' };
    return r.fulfill({ json: data });
  });
}

test('serializes metadata and body writes and carries the latest revision', async () => {
  let revision = initial.revision;
  let active = 0;
  const tokens: string[] = [];
  const api = {
    update: async (_id: string, data: any) => { expect(data.expectedUpdatedAt).toBe(revision); expect(active++).toBe(0); await new Promise(r => setTimeout(r, 15)); active--; revision = 'metadata-revision'; return { updatedAt: revision }; },
    updateContent: async (_id: string, _body: any, token?: string) => { expect(active++).toBe(0); expect(token).toBe(revision); tokens.push(token!); active--; revision = 'body-revision'; return { updatedAt: revision }; },
  };
  const queue = new DocumentSaveQueue('doc-1', initial, api, 'draft', storage());
  queue.setContent(content('Edited'));
  await Promise.all([queue.updateMetadata({ title: 'Rename' }), queue.flush()]);
  expect(tokens).toEqual(['metadata-revision']);
  expect(queue.state).toBe('saved');
});

test('edits during a slow save are retained and saved with the next revision', async () => {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const began = new Promise<void>(r => { started = r; });
  const writes: any[] = [];
  const queue = new DocumentSaveQueue('doc-1', initial, {
    update: async () => ({}),
    updateContent: async (_id, body, token) => { writes.push({ body, token }); if (writes.length === 1) { started(); await gate; } return { updatedAt: `revision-${writes.length}` }; },
  }, 'draft', storage());
  queue.setContent(content('First'));
  const first = queue.flush(); await began;
  queue.setContent(content('Latest')); const second = queue.flush(); release();
  await Promise.all([first, second]);
  expect(writes[1]).toEqual({ body: content('Latest'), token: 'revision-1' });
  expect(queue.state).toBe('saved');
});

test('conflicts retain drafts and block automatic overwrites; explicit reload resolves them', async () => {
  const drafts = storage(); let attempts = 0;
  const api = { update: async () => ({}), updateContent: async () => { attempts++; throw { status: 409 }; } };
  const queue = new DocumentSaveQueue('doc-1', initial, api, 'draft', drafts);
  queue.setContent(content('My draft'));
  await expect(queue.flush()).rejects.toEqual({ status: 409 });
  queue.setContent(content('More changes'));
  await expect(queue.flush()).rejects.toThrow('Resolve the document conflict');
  expect(attempts).toBe(1); expect(queue.state).toBe('conflict');
  const recovered = new DocumentSaveQueue('doc-1', initial, api, 'draft', drafts);
  expect(recovered.content).toEqual(content('More changes'));
  expect(recovered.recovered).toBe(true);
  await queue.replaceFromServer({ ...initial, revision: 'fresh' });
  expect(queue.state).toBe('saved'); expect(drafts.getItem('draft')).toBeNull();
});

test('network failure retains title and content for explicit retry', async () => {
  const drafts = storage(); let fail = true;
  const queue = new DocumentSaveQueue('doc-1', initial, {
    update: async () => ({ updatedAt: 'title-revision' }),
    updateContent: async () => { if (fail) throw new Error('Offline'); return { updatedAt: 'saved-revision' }; },
  }, 'draft', drafts);
  queue.setTitle('New title'); queue.setContent(content('New body'));
  await expect(queue.flush()).rejects.toThrow('Offline');
  expect(queue.state).toBe('error'); expect(drafts.getItem('draft')).not.toBeNull();
  fail = false; await queue.flush();
  expect(queue.state).toBe('saved'); expect(drafts.getItem('draft')).toBeNull();
});

test('document selection follows URLs and browser history with keyboard access', async ({ page }) => {
  await mockApi(page); await page.goto('/app/brain?doc=doc-1');
  const release = page.getByRole('button', { name: 'Release checklist', exact: true });
  await release.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/doc=doc-2/);
  await expect(page.getByLabel('Document title')).toHaveValue('Release checklist');
  await page.goBack(); await expect(page.getByLabel('Document title')).toHaveValue('Architecture notes');
  await page.goto('/app/brain?doc=missing');
  await expect(page.getByText('Document unavailable', { exact: true })).toBeVisible();
  await expect(page.locator('.tiptap')).toHaveCount(0);
});

test('search renders safe highlights and keyboard-activatable results', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/v1/**/search**', r => r.fulfill({ json: [{ id: 'doc-2', title: 'Safe result', snippet: '<b>architecture</b><img src="/missing" onerror="window.__unsafe=true"><svg onload="window.__unsafe=true"></svg>' }] }));
  await page.goto('/app/brain'); await page.getByRole('button', { name: 'Search Specs...' }).click();
  await page.getByLabel('Search documents', { exact: true }).fill('architecture');
  const result = page.getByRole('button', { name: /Safe result/ });
  await expect(result.locator('mark')).toHaveText('architecture');
  await expect(result.locator('img, svg[onload]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__unsafe)).toBeUndefined();
  await result.focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Document title')).toHaveValue('Release checklist');
});

test('search ignores stale responses, cancels clearing, and presents recoverable errors', async ({ page }) => {
  await mockApi(page);
  let release!: () => void; let started = false; let fail = false;
  const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/**/search**', async r => {
    const q = new URL(r.request().url()).searchParams.get('q');
    if (q === 'old') { started = true; await gate; }
    await r.fulfill({ status: fail ? 500 : 200, json: fail ? { message: 'Search unavailable' } : [{ id: 'doc-1', title: `${q} result` }] }).catch(() => {});
  });
  await page.goto('/app/brain'); await page.getByRole('button', { name: 'Search Specs...' }).click();
  const input = page.getByLabel('Search documents', { exact: true });
  await input.fill('old'); await expect.poll(() => started).toBe(true);
  await input.fill('new'); await expect(page.getByRole('button', { name: /new result/ })).toBeVisible();
  release(); await page.waitForTimeout(100);
  await expect(page.getByRole('button', { name: /old result/ })).toHaveCount(0);
  await input.fill(''); await expect(page.getByRole('button', { name: /new result/ })).toHaveCount(0);
  fail = true; await input.fill('failure'); await expect(page.getByRole('alert')).toContainText('Search unavailable');
  fail = false; await page.getByRole('button', { name: 'Retry search' }).click();
  await expect(page.getByRole('button', { name: /failure result/ })).toBeVisible();
});

test('mobile AI pane keeps editor geometry and traps/restores keyboard focus', async ({ page }, testInfo) => {
  await mockApi(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/brain?doc=doc-1');
  const trigger = page.locator('button').filter({ hasText: 'AI Assist' });
  await trigger.click(); const dialog = page.getByRole('dialog', { name: 'AI Assist' });
  await expect(dialog).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect((await page.locator('.tiptap').boundingBox())!.width).toBeGreaterThan(width * .7);
    const rect = (await dialog.boundingBox())!; expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`brain-ai-${width}.png`) });
  }
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
});

test('returning during an unmount save reuses the pending document writer', async () => {
  let release!: () => void; let started!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const began = new Promise<void>(r => { started = r; });
  const queue = new DocumentSaveQueue('pending-doc', initial, { update: async () => ({}), updateContent: async () => { started(); await gate; return { updatedAt: 'final-revision' }; } }, 'pending-draft', storage());
  const detach = retainDocumentSaveQueue('pending-draft', queue);
  queue.setContent(content('Leaving draft')); detach(); await began;
  const resumed = acquireDocumentSaveQueue('pending-draft', () => { throw new Error('Started a competing writer'); });
  const detachAgain = retainDocumentSaveQueue('pending-draft', resumed);
  expect(resumed).toBe(queue); release(); await resumed.whenIdle();
  expect(resumed.revision).toBe('final-revision'); expect(resumed.state).toBe('saved'); detachAgain();
});

test('failed browser save recovers its draft after reload and can retry', async ({ page }) => {
  await mockApi(page); let fail = true; let saved: any;
  await page.route('**/api/v1/documents/doc-1', r => r.fulfill({ json: { ...original, updatedAt: initial.revision } }));
  await page.route('**/api/v1/documents/doc-1/content', async r => {
    if (fail) return r.fulfill({ status: 503, json: { message: 'Offline' } });
    saved = r.request().postDataJSON().contentJson;
    await r.fulfill({ json: { updatedAt: '2026-10-06T00:00:01.000Z' } });
  });
  await page.goto('/app/brain?doc=doc-1'); await page.locator('.tiptap').fill('Recover this draft');
  await expect(page.getByRole('status').filter({ hasText: /Save failed/ })).toBeVisible();
  await page.reload(); await expect(page.locator('.tiptap')).toHaveText('Recover this draft');
  fail = false; await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(saved).toEqual(content('Recover this draft'));
});

test('own rename then body edit saves with new token and reports Saved', async ({ page }) => {
  await mockApi(page); let stored = structuredClone(original); let version = 0; const attempts: any[] = [];
  await page.route(/\/api\/v1\/documents(?:\?.*)?$/, r => { const { contentJson: _content, ...metadata } = stored; return r.fulfill({ json: { items: [metadata], nextCursor: null } }); });
  await page.route('**/api/v1/documents/doc-1', async r => {
    if (r.request().method() === 'PATCH') {
      const { expectedUpdatedAt, ...metadata } = r.request().postDataJSON();
      if (expectedUpdatedAt !== stored.updatedAt) return r.fulfill({ status: 409, json: { message: 'Conflict' } });
      stored = { ...stored, ...metadata, updatedAt: `2026-10-06T00:00:0${++version}.000Z` };
    }
    await r.fulfill({ json: stored });
  });
  await page.route('**/api/v1/documents/doc-1/content', async r => {
    const body = r.request().postDataJSON(); attempts.push(body);
    if (body.expectedUpdatedAt !== stored.updatedAt) return r.fulfill({ status: 409, json: { message: 'Conflict' } });
    stored = { ...stored, contentJson: body.contentJson, updatedAt: `2026-10-06T00:00:0${++version}.000Z` };
    await r.fulfill({ json: stored });
  });
  await page.goto('/app/brain'); await page.getByLabel('Document title').fill('Renamed notes');
  await expect.poll(() => stored.title).toBe('Renamed notes');
  await page.locator('.tiptap').fill('Latest body');
  await expect.poll(() => attempts.length).toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(stored.contentJson).toEqual(content('Latest body'));
});

test('metadata conflict cannot silently rebase and overwrite another writer', async () => {
  let bodyWrites = 0;
  const queue = new DocumentSaveQueue('doc-1', initial, {
    update: async (_id, metadata) => { expect(metadata.expectedUpdatedAt).toBe(initial.revision); throw { status: 409 }; },
    updateContent: async () => { bodyWrites++; return {}; },
  }, 'draft', storage());
  queue.setTitle('My title'); queue.setContent(content('My body'));
  await expect(queue.flush()).rejects.toEqual({ status: 409 });
  expect(bodyWrites).toBe(0); expect(queue.state).toBe('conflict');
});

test('browser conflict retains edits, blocks later writes, and offers explicit recovery', async ({ page }) => {
  await mockApi(page); let attempts = 0;
  await page.route('**/api/v1/documents/doc-1/content', r => { attempts++; return r.fulfill({ status: 409, json: { message: 'Modified elsewhere' } }); });
  await page.goto('/app/brain?doc=doc-1'); await page.locator('.tiptap').fill('My conflicting draft');
  await expect(page.getByRole('status').filter({ hasText: /Conflict/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download my draft' })).toBeVisible();
  await page.locator('.tiptap').fill('Keep these further edits'); await page.waitForTimeout(650);
  expect(attempts).toBe(1); await expect(page.locator('.tiptap')).toHaveText('Keep these further edits');
  await page.route('**/api/v1/documents/doc-1', r => r.fulfill({ json: { ...original, contentJson: content('Other writer'), updatedAt: '2026-10-06T00:00:01.000Z' } }));
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Load saved version' }).click();
  await expect(page.locator('.tiptap')).toHaveText('Other writer');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
});

test('snapshot restore flushes edits first and does not autosave restored content again', async ({ page }) => {
  await mockApi(page); const actions: string[] = [];
  await page.route('**/api/v1/documents/doc-1/content', async r => { actions.push('save'); await r.fulfill({ json: { updatedAt: '2026-10-06T00:00:01.000Z' } }); });
  await page.route('**/api/v1/documents/doc-1/versions', r => r.fulfill({ json: [{ id: 'version-1', versionNumber: 1, createdAt: initial.revision }] }));
  await page.route('**/api/v1/documents/doc-1/versions/version-1/restore', async r => { actions.push('restore'); await r.fulfill({ json: { ...original, contentJson: content('Restored body'), updatedAt: '2026-10-06T00:00:02.000Z' } }); });
  await page.goto('/app/brain'); await page.locator('.tiptap').fill('Unsaved body');
  await page.getByRole('button', { name: 'More actions (Move, Duplicate, History, Export)' }).click();
  await page.getByRole('button', { name: 'Version History', exact: true }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('.tiptap')).toHaveText('Restored body');
  await page.waitForTimeout(650);
  expect(actions).toEqual(['save', 'restore']);
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
});
