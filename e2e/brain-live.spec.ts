import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

// Explicit opt-in: this suite uses real local services and creates its own user.
test.skip(process.env.KRAMA_LIVE_VERIFY !== '1', 'Requires explicit live verification opt-in');
const marker = `Brain Verification ${crypto.randomUUID()}`;
const email = `brain-verify-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString('hex');
const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
let userId = '', workspaceId = '', token = '', root: any, child: any;
const documentIds = new Set<string>();
let api: APIRequestContext;
const results: { check: string; status: string }[] = [];

async function call(method: string, path: string, data?: unknown, status = 200) {
  // Playwright transport errors include request headers; never forward them to
  // the reporter, even though this account is disposable and deleted afterward.
  const response = await api.fetch(path, { method, data, headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId }, timeout: path.includes('/ai/') ? 70000 : 20000 }).catch(error => {
    throw new Error(`${method} ${path}: ${error?.name === 'TimeoutError' ? 'request timed out' : 'transport failure'}`);
  });
  let detail = '';
  if (response.status() !== status) {
    detail = String((await response.json().catch(() => ({}))).message || '');
    for (const name of ['GROQ_API_KEY', 'GEMINI_API_KEY', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']) if (process.env[name]) detail = detail.replaceAll(process.env[name]!, '[redacted]');
  }
  expect(response.status(), `${method} ${path}: ${detail.slice(0, 400)}`).toBe(status);
  return response;
}
async function json(method: string, path: string, data?: unknown, status = 200) {
  return (await call(method, path, data, status)).json();
}
function record(check: string) { results.push({ check, status: 'passed' }); console.log(`LIVE PASS: ${check}`); }

test.beforeAll(async () => {
  api = await playwrightRequest.newContext({ baseURL: new URL('/api/v1/', process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000').href });
  const response = await api.post('auth/signup', { data: { name: marker, email, password } });
  expect(response.status()).toBe(201);
  const auth = await response.json(); token = auth.accessToken; userId = auth.user.id;
  const workspaces = await json('GET', 'workspaces');
  workspaceId = workspaces.find((w: any) => w.createdBy === userId)?.id || workspaces[0]?.id;
  expect(workspaceId).toBeTruthy();
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/brain-live-fixture.json', JSON.stringify({ marker, email, userId, workspaceId }));
  const space = await json('POST', 'spaces', { name: marker }, 201);
  root = await json('POST', 'documents', { title: 'Verification launch notes', spaceId: space.id, contentJson: paragraph('The verification launch code is SAPPHIRE42. Aurora canary is a searchable phrase.') }, 201);
  documentIds.add(root.id);
  child = await json('POST', 'documents', { title: 'Verification child', parentId: root.id, contentJson: paragraph('Child checklist for verification.') }, 201);
  documentIds.add(child.id);
});

test('live documents: save/reopen, conflicts, tree, links, search, import/export, trash and snapshots', async ({ page }) => {
  root = await json('PATCH', `documents/${root.id}`, { title: 'Renamed verification notes', expectedUpdatedAt: root.updatedAt });
  const originalRevision = root.updatedAt;
  const saved = await json('PATCH', `documents/${root.id}/content`, { contentJson: paragraph('The verification launch code is SAPPHIRE42. Aurora canary survives a real database save.'), expectedUpdatedAt: root.updatedAt });
  root = await json('GET', `documents/${root.id}`);
  expect(root.contentMarkdown).toContain('Aurora canary'); expect(root.updatedAt).toBe(saved.updatedAt);
  await call('PATCH', `documents/${root.id}/content`, { contentJson: paragraph('Must not overwrite'), expectedUpdatedAt: originalRevision }, 409);
  await call('PATCH', `documents/${root.id}`, { title: 'Must not rename', expectedUpdatedAt: originalRevision }, 409);
  record('real metadata/body saves and stale-write rejection');

  const moved = await json('POST', `documents/${child.id}/move`, { targetParentId: null }); expect(moved.parentId).toBeNull();
  const returned = await json('POST', `documents/${child.id}/move`, { targetParentId: root.id }); expect(returned.parentId).toBe(root.id);
  const duplicate = await json('POST', `documents/${root.id}/duplicate`, undefined, 201); documentIds.add(duplicate.id);
  const listed = await json('GET', 'documents');
  const copiedChild = listed.find((d: any) => d.parentId === duplicate.id); expect(copiedChild).toBeTruthy(); documentIds.add(copiedChild.id);
  record('nested move and subtree duplication');

  const link = await json('POST', `documents/${root.id}/links`, { targetType: 'DOCUMENT', targetId: child.id, linkType: 'REFERENCE' }, 201);
  const outgoing = await json('GET', `documents/${root.id}/links`); const incoming = await json('GET', `documents/${child.id}/links`);
  expect(outgoing.outgoing.some((l: any) => l.id === link.id)).toBe(true); expect(incoming.incoming.some((l: any) => l.id === link.id)).toBe(true);
  const graph = await json('GET', `workspaces/${workspaceId}/graph`); expect(graph.nodes.some((n: any) => n.id === root.id)).toBe(true);
  const search = await json('GET', `workspaces/${workspaceId}/search?q=Aurora`); expect(search.some((d: any) => d.id === root.id)).toBe(true);
  const tag = await json('POST', `documents/${root.id}/tags`, { tagName: 'verification' });
  expect((await json('GET', `workspaces/${workspaceId}/tags`)).some((t: any) => t.id === tag.id)).toBe(true);
  record('links/backlinks, graph, tags, and PostgreSQL full-text search');

  const inlineTarget = await json('POST', 'documents', { title: 'Inline-only target', spaceId: root.spaceId }, 201); documentIds.add(inlineTarget.id);
  let current = await json('GET', `documents/${root.id}`);
  const withInline = paragraph('Inline target');
  (withInline.content[0].content[0] as any).marks = [{ type: 'link', attrs: { href: '#', 'data-doc-id': inlineTarget.id } }];
  await json('PATCH', `documents/${root.id}/content`, { contentJson: withInline, expectedUpdatedAt: current.updatedAt });
  expect((await json('GET', `documents/${root.id}/links`)).outgoing.some((l: any) => l.targetId === inlineTarget.id)).toBe(true);
  current = await json('GET', `documents/${root.id}`);
  await json('PATCH', `documents/${root.id}/content`, { contentJson: paragraph('The verification launch code is SAPPHIRE42. Aurora canary.'), expectedUpdatedAt: current.updatedAt });
  const reconciled = await json('GET', `documents/${root.id}/links`);
  expect(reconciled.outgoing.some((l: any) => l.targetId === inlineTarget.id)).toBe(false);
  expect(reconciled.outgoing.some((l: any) => l.id === link.id)).toBe(true);
  record('inline reference removal preserves explicit document links');

  const markdown = await (await call('GET', `documents/${root.id}/export?format=md`)).text(); expect(markdown).toContain('SAPPHIRE42');
  const specification = await (await call('GET', `documents/${root.id}/export?format=spec`)).text(); expect(specification).toContain('Verification child');
  const imported = await json('POST', 'documents/import', { content: specification, spaceId: root.spaceId }, 201);
  expect(imported.document.id).toBeTruthy(); documentIds.add(imported.document.id);
  record('Markdown/spec export and spec import');

  await json('POST', `documents/${root.id}/versions`, undefined, 201);
  await expect.poll(async () => (await json('GET', `documents/${root.id}/versions`)).length, { timeout: 15000 }).toBeGreaterThan(0);
  const versions = await json('GET', `documents/${root.id}/versions`);
  const revision = await json('GET', `documents/${root.id}`);
  await json('PATCH', `documents/${root.id}/content`, { contentJson: paragraph('Temporary edited version'), expectedUpdatedAt: revision.updatedAt });
  root = await json('POST', `documents/${root.id}/versions/${versions[0].id}/restore`); expect(root.contentMarkdown).toContain('SAPPHIRE42');
  record('real queue worker snapshot creation and version restore');

  await json('DELETE', `documents/${duplicate.id}`);
  expect((await json('GET', 'documents?deleted=true')).some((d: any) => d.id === duplicate.id)).toBe(true);
  await call('GET', `documents/${duplicate.id}`, undefined, 404);
  await json('POST', `documents/${duplicate.id}/restore`);
  expect((await json('GET', `documents/${copiedChild.id}`)).deletedAt).toBeNull();
  await json('DELETE', `documents/${duplicate.id}/permanent`);
  await call('GET', `documents/${duplicate.id}`, undefined, 404);
  record('subtree trash, restore, and permanent purge of verification fixtures');

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/app(?:\/|$)/);
  await page.goto(`/app/brain?doc=${root.id}`);
  await expect(page.getByLabel('Document title')).toHaveValue('Renamed verification notes');
  await page.getByLabel('Document title').fill('Browser verification notes');
  await page.locator('.tiptap').fill('The verification launch code is SAPPHIRE42. Saved through the real Brain editor.');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect.poll(async () => (await json('GET', `documents/${root.id}`)).contentMarkdown).toContain('real Brain editor');
  await page.reload(); await expect(page.locator('.tiptap')).toContainText('real Brain editor');
  await expect(page.getByLabel('Document title')).toHaveValue('Browser verification notes');
  const persistedLinks = await json('GET', `documents/${root.id}/links`);
  expect(persistedLinks.outgoing.some((l: any) => l.id === link.id), 'Explicit document links must survive ordinary autosave').toBe(true);
  record('live browser sign-in, editor autosave, and reload persistence');
});

test('live background idle snapshot and Gemini embeddings', async () => {
  const { documentVersionQueue } = await import('../apps/server/src/queues');
  const { prisma } = await import('../apps/server/src/prisma');
  const before = await prisma.documentVersion.count({ where: { documentId: root.id } });
  const fresh = await json('GET', `documents/${root.id}`);
  await json('PATCH', `documents/${root.id}/content`, { contentJson: paragraph('The verification launch code is SAPPHIRE42. A synthetic embedding verification note.'), expectedUpdatedAt: fresh.updatedAt });
  const job = await documentVersionQueue.getJob(`idle-snapshot-${root.id}`); expect(job).toBeTruthy(); expect(job!.opts.delay).toBe(300000);
  // Verify the real delayed job/processor without waiting five minutes.
  await job!.promote();
  await expect.poll(async () => prisma.documentVersion.count({ where: { documentId: root.id } }), { timeout: 15000 }).toBeGreaterThan(before);
  record('five-minute idle scheduling and real delayed snapshot processor');
  await expect.poll(async () => prisma.knowledgeChunk.count({ where: { documentId: root.id } }), { timeout: 45000 }).toBeGreaterThan(0);
  record('real Gemini embedding and knowledge-chunk persistence');
});

for (const [mode, body] of [
    ['ask', { question: 'What is the verification launch code? Reply with just the code.' }],
    ['compose', { instruction: 'Write one short sentence saying the verification is complete.', mode: 'write' }],
  ] as const) {
  test(`live AI ${mode} stream`, async () => {
    const response = await call('POST', `documents/${root.id}/ai/${mode}`, body);
    const text = await response.text(); expect(text).toContain('data: [DONE]');
    const chunks = text.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
    expect(chunks.some(c => c.error)).toBe(false);
    const answer = chunks.map(c => c.text || '').join(''); expect(answer.trim().length).toBeGreaterThan(0);
    if (mode === 'ask') expect(answer).toContain('SAPPHIRE42');
    record(`live AI ${mode} streaming`);
  });
}

test.afterAll(async () => {
  if (!userId || !workspaceId) { await api?.dispose(); return; }
  const { prisma } = await import('../apps/server/src/prisma');
  const queues = await import('../apps/server/src/queues');
  const { redisService } = await import('../apps/server/src/services/redis.service');
  try {
    const owner = await prisma.user.findUnique({ where: { id: userId } });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (owner?.email !== email || workspace?.createdBy !== userId || owner.name !== marker) throw new Error('Fixture ownership check failed; refusing cleanup');
    const docs = await prisma.document.findMany({ where: { space: { workspaceId } }, select: { id: true } });
    docs.forEach(d => documentIds.add(d.id));
    for (const queue of [queues.documentVersionQueue, queues.embeddingQueue]) {
      // Only remove jobs belonging to this run. Never clear a shared queue.
      for (let attempt = 0; attempt < 20; attempt++) {
        const jobs = await queue.getJobs(['waiting', 'delayed', 'failed', 'completed', 'active'], 0, -1);
        const owned = jobs.filter(j => documentIds.has(j.data?.documentId));
        let active = false;
        for (const job of owned) { if (await job.isActive()) active = true; else await job.remove(); }
        if (!active) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    await prisma.entityLink.deleteMany({ where: { OR: [{ sourceId: { in: [...documentIds] } }, { targetId: { in: [...documentIds] } }] } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    const sessions = await prisma.session.findMany({ where: { userId }, select: { id: true } });
    await prisma.user.delete({ where: { id: userId } });
    for (const id of documentIds) await redisService.del(`doc:${id}:mutations`);
    for (const session of sessions) await redisService.del(`session_revoked:${session.id}`);
    record('temporary verification account, workspace, documents, and queued jobs cleaned up');
  } finally {
    writeFileSync('test-results/brain-live-results.json', JSON.stringify({ date: new Date().toISOString(), checks: results }, null, 2));
    await Promise.all([queues.documentVersionQueue.close(), queues.embeddingQueue.close(), queues.notificationsQueue.close(), queues.habitStreakQueue.close(), queues.analyticsQueue.close()]);
    redisService.client.disconnect();
    const { connection } = await import('../apps/server/src/lib/redis'); connection.disconnect();
    await prisma.$disconnect(); await (globalThis as any).pool?.end();
    await api.dispose();
  }
});
