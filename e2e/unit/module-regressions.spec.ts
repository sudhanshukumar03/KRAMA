import { test, expect } from '@playwright/test';
import { DocumentSaveQueue, acquireDocumentSaveQueue, retainDocumentSaveQueue } from '../../apps/web/src/lib/documentSaveQueue';
import { WeekQuerySchema, TimeBlockSchema } from '../../packages/validation/src/planner';
import { parseLocalDate } from '../../apps/web/src/lib/utils';
import { applyLocalRepulsion } from '../../apps/web/src/lib/graphLayout';
test.describe('API session regression checks', () => {
  test('expired account settings refresh once and retry', async () => {
    const { api } = await import('../../apps/web/src/api/client');
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
    const { api } = await import('../../apps/web/src/api/client');
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
    const { api } = await import('../../apps/web/src/api/client');
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

  test('a rejected refreshed token clears the session once for concurrent requests', async () => {
    const { api } = await import('../../apps/web/src/api/client');
    const originalFetch = globalThis.fetch;
    let refreshes = 0;
    let logouts = 0;
    const tokens: (string | null)[] = [];
    api.setAccessToken('expired');
    api.setGlobalLogoutHandler(() => { logouts++; });
    const unsubscribe = api.subscribeAccessToken(token => tokens.push(token));
    globalThis.fetch = async input => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshes++;
        return Response.json({ accessToken: 'revoked' });
      }
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    };
    try {
      const results = await Promise.allSettled([api.auth.me(), api.workspaces.list()]);
      expect(results.every(result => result.status === 'rejected')).toBe(true);
      expect(refreshes).toBe(1);
      expect(logouts).toBe(1);
      expect(tokens).toEqual(['revoked', null]);
    } finally {
      unsubscribe(); globalThis.fetch = originalFetch;
      api.setGlobalLogoutHandler(() => {}); api.setAccessToken(null);
    }
  });

  test('a delayed retry rejection cannot clear a new login', async () => {
    const { api } = await import('../../apps/web/src/api/client');
    const originalFetch = globalThis.fetch;
    let release!: (response: Response) => void;
    let retried!: () => void;
    const retryStarted = new Promise<void>(resolve => { retried = resolve; });
    let logouts = 0;
    const tokens: (string | null)[] = [];
    api.setAccessToken('expired');
    api.setGlobalLogoutHandler(() => { logouts++; });
    const unsubscribe = api.subscribeAccessToken(token => tokens.push(token));
    globalThis.fetch = async (input, options) => {
      if (String(input).endsWith('/auth/refresh')) return Response.json({ accessToken: 'old-renewed' });
      if (new Headers(options?.headers).get('Authorization') === 'Bearer old-renewed') {
        retried();
        return new Promise(resolve => { release = resolve; });
      }
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    };
    try {
      const pending = api.auth.me();
      await retryStarted;
      api.setAccessToken('new-account');
      release(Response.json({ message: 'Unauthorized' }, { status: 401 }));
      await expect(pending).rejects.toMatchObject({ status: 401 });
      expect(logouts).toBe(0);
      expect(tokens).toEqual(['old-renewed', 'new-account']);
    } finally {
      unsubscribe(); globalThis.fetch = originalFetch;
      api.setGlobalLogoutHandler(() => {}); api.setAccessToken(null);
    }
  });
});


const content = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const initial = { content: content('Original body'), title: 'Architecture notes', revision: '2026-10-06T00:00:00.000Z' };
function storage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  };
}

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


test('validates real dates, bounded ranges and wall-clock times', () => {
  const day = '2025-10-15';
  expect(parseLocalDate('2025-02-30')).toBeNull();
  expect(parseLocalDate('broken-date')).toBeNull();
  expect(WeekQuerySchema.safeParse({ start: '2025-02-30', end: '2025-03-01' }).success).toBe(false);
  expect(WeekQuerySchema.safeParse({ start: day, end: '2025-10-14' }).success).toBe(false);
  expect(WeekQuerySchema.safeParse({ start: day, end: '2030-10-15' }).success).toBe(false);
  for (const time of ['24:00', '09:60', '99:99']) expect(TimeBlockSchema.safeParse({ title: 'Work', date: day, startTime: time, endTime: '10:00', type: 'WORK' }).success).toBe(false);
  expect(TimeBlockSchema.safeParse({ title: 'Work', date: '2024-02-29', startTime: '09:00', endTime: '10:00', type: 'WORK' }).success).toBe(true);
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

