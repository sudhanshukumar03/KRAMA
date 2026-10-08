import { spawn } from 'node:child_process';
import express from 'express';
import plannerRouter from '../routes/planner.routes';
import workspaceRouter from '../routes/workspace.routes';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { socketService } from '../services/socket.service';
import { authService } from '../services/auth.service';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../prisma';
import { createIntegrationFixture, cleanupIntegrationFixture } from '../testing/integrationFixture';
import { saveDocumentContent, snapshotDocument, commitDocumentIndex, queueDocumentEmbedding } from '../services/documentContent.service';
import { DocumentService } from '../services/document.service';
import { createVersion, restoreVersion } from '../controllers/document.controller';
import { goalService } from '../services/goal.service';
import { habitService } from '../services/habit.service';
import { deleteProject, restoreProject } from '../controllers/project.controller';
import { completeFocusSession } from '../controllers/focusSession.controller';
import { getWorkspaceDocuments, importDocumentSpec, updateDocumentMetadata } from '../controllers/document.controller';
import { buildFocusSchedule } from '../services/focusTimer.service';
import { workspaceService } from '../services/workspace.service';
import { requireWorkspaceRole } from '../middlewares/rbac.middleware';

let fixture: Awaited<ReturnType<typeof createIntegrationFixture>>;
let doc: any;
let foreignWorkspace: any;
let foreignDoc: any;
const body = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const response = () => ({ code: 200, payload: null as any, status(code: number) { this.code = code; return this; }, json(data: any) { this.payload = data; return this; } });
const request = (id = doc.id, data: any = {}) => ({ params: { id }, headers: { 'x-workspace-id': fixture.workspace.id }, user: { id: fixture.user.id }, workspaceId: fixture.workspace.id, body: data, query: {} }) as any;
before(async () => {
  fixture = await createIntegrationFixture('followup');
  const space = await prisma.space.create({ data: { name: 'Brain', workspaceId: fixture.workspace.id } });
  doc = await DocumentService.createDocument({ title: 'Source', spaceId: space.id, createdById: fixture.user.id, contentJson: body('Initial') });
  foreignWorkspace = await prisma.workspace.create({ data: { name: `${fixture.marker}-foreign`, createdBy: fixture.user.id } });
  const foreignSpace = await prisma.space.create({ data: { name: 'Foreign', workspaceId: foreignWorkspace.id } });
  foreignDoc = await prisma.document.create({ data: { title: 'Foreign', spaceId: foreignSpace.id, createdById: fixture.user.id, lastEditedById: fixture.user.id, contentMarkdown: 'secret', contentJson: body('secret') } });
});
after(async () => {
  await prisma.workspace.delete({ where: { id: foreignWorkspace.id } });
  await cleanupIntegrationFixture(fixture);
  await prisma.$disconnect();
  await (globalThis as any).pool?.end();
  const { connection } = await import('../lib/redis'); await connection.quit();
  const { redisService } = await import('../services/redis.service'); await redisService.client.quit();
});

test('document list pages return bounded metadata without bodies', async () => {
  await DocumentService.createDocument({ title: 'Second list entry', spaceId: doc.spaceId, createdById: fixture.user.id, contentJson: body('Large body omitted') });
  const firstRequest = request();
  firstRequest.query = { limit: '1' };
  const firstResponse = response();
  await getWorkspaceDocuments(firstRequest, firstResponse as any);
  assert.equal(firstResponse.code, 200);
  assert.equal(firstResponse.payload.items.length, 1);
  assert.equal('contentJson' in firstResponse.payload.items[0], false);
  assert.equal('contentMarkdown' in firstResponse.payload.items[0], false);
  assert.ok(firstResponse.payload.nextCursor);

  const secondRequest = request();
  secondRequest.query = { limit: '1', cursor: firstResponse.payload.nextCursor };
  const secondResponse = response();
  await getWorkspaceDocuments(secondRequest, secondResponse as any);
  assert.equal(secondResponse.payload.items.length, 1);
  assert.notEqual(secondResponse.payload.items[0].id, firstResponse.payload.items[0].id);
});

test('production document HTTP errors hide injected database details and malformed metadata returns 400', async () => {
  const previous = process.env.NODE_ENV;
  const originalList = prisma.document.findMany;
  const originalUpdate = prisma.document.update;
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { user: { id: fixture.user.id }, workspaceId: fixture.workspace.id }); next(); });
  app.get('/documents', getWorkspaceDocuments); app.patch('/documents/:id', updateDocumentMetadata);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.NODE_ENV = 'production';
  try {
    const malformed = await fetch(`${base}/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 42 }) });
    assert.equal(malformed.status, 400);
    const fail = async () => { throw new Error('SELECT private_column FROM private_schema; database password=hidden'); };
    (prisma.document as any).findMany = fail; (prisma.document as any).update = fail;
    const requests = [await fetch(`${base}/documents`), await fetch(`${base}/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'valid' }) })];
    for (const reply of requests) {
      assert.equal(reply.status, 500); const payload = await reply.json() as any;
      assert.equal(payload.message, 'Internal server error'); assert.match(payload.requestId, /^[0-9a-f-]{36}$/);
      assert.doesNotMatch(JSON.stringify(payload), /private_column|private_schema|password|hidden/);
    }
  } finally {
    (prisma.document as any).findMany = originalList; (prisma.document as any).update = originalUpdate;
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('document import rejects a foreign parent before creating spaces, documents or tags', async () => {
  const before = {
    spaces: await prisma.space.count({ where: { workspaceId: fixture.workspace.id } }),
    documents: await prisma.document.count({ where: { space: { workspaceId: fixture.workspace.id } } }),
    tags: await prisma.tag.count({ where: { workspaceId: fixture.workspace.id } }),
  };
  const req = request();
  req.body = { content: '# Imported spec', parentId: foreignDoc.id };
  const res = response();
  await importDocumentSpec(req, res as any);
  assert.equal(res.code, 400);
  assert.deepEqual({
    spaces: await prisma.space.count({ where: { workspaceId: fixture.workspace.id } }),
    documents: await prisma.document.count({ where: { space: { workspaceId: fixture.workspace.id } } }),
    tags: await prisma.tag.count({ where: { workspaceId: fixture.workspace.id } }),
  }, before);
});

test('inline foreign references reject atomically; valid links reconcile on restore', async () => {
  const reference = (id: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'link', marks: [{ type: 'link', attrs: { 'data-doc-id': id } }] }] }] });
  await assert.rejects(saveDocumentContent(doc.id, reference(foreignDoc.id), fixture.user.id), /this workspace/);
  assert.equal((await prisma.document.findUniqueOrThrow({ where: { id: doc.id } })).contentMarkdown, 'Initial\n\n');
  const target = await DocumentService.createDocument({ title: 'Reference', spaceId: doc.spaceId, createdById: fixture.user.id });
  await saveDocumentContent(doc.id, reference(target.id), fixture.user.id);
  const version = await prisma.$transaction(tx => snapshotDocument(tx, doc.id, fixture.user.id));
  await saveDocumentContent(doc.id, body('Replacement'), fixture.user.id);
  assert.equal(await prisma.entityLink.count({ where: { sourceId: doc.id } }), 0);
  const req = request(); req.params.versionId = version.id;
  const res = response(); await restoreVersion(req, res as any);
  assert.equal(res.code, 200);
  assert.equal(await prisma.entityLink.count({ where: { sourceId: doc.id, targetId: target.id } }), 1);
});

test('duplicated documents preserve counts, scoped references and enqueue fresh indexing', async () => {
  const copiedId = await DocumentService.duplicateSubtree(doc.id, fixture.user.id);
  const copied = await prisma.document.findUniqueOrThrow({ where: { id: copiedId } });
  const original = await prisma.document.findUniqueOrThrow({ where: { id: doc.id } });
  assert.equal(copied.wordCount, original.wordCount);
  assert.equal(copied.charCount, original.charCount);
  assert.equal(await prisma.entityLink.count({ where: { sourceId: copiedId } }), 1);
});

test('concurrent snapshots allocate unique numbers and retry a job exactly once', async () => {
  const rows = await Promise.all(Array.from({ length: 6 }, () => prisma.$transaction(tx => snapshotDocument(tx, doc.id, fixture.user.id))));
  assert.equal(new Set(rows.map(row => row.versionNumber)).size, 6);
  const retries = await Promise.all(Array.from({ length: 3 }, () => prisma.$transaction(tx => snapshotDocument(tx, doc.id, fixture.user.id, body('Retry'), 'owned-retry'))));
  assert.equal(new Set(retries.map(row => row.id)).size, 1);
  const res = response(); await createVersion(request(), res as any);
  assert.equal(res.code, 201);
  assert.ok(await prisma.documentVersion.findUnique({ where: { id: res.payload.id } }));
});

test('index commits reject old revisions and empty saves purge old knowledge', async () => {
  const updated = await saveDocumentContent(doc.id, body('New body'), fixture.user.id);
  const vector = `[${Array(768).fill(0).join(',')}]`;
  assert.equal(await commitDocumentIndex(doc.id, updated.contentMarkdown!, [{ text: 'New body', vector }]), true);
  assert.equal(await prisma.knowledgeChunk.count({ where: { documentId: doc.id } }), 1);
  await saveDocumentContent(doc.id, body(''), fixture.user.id);
  assert.equal(await prisma.knowledgeChunk.count({ where: { documentId: doc.id } }), 0);
  assert.equal(await commitDocumentIndex(doc.id, updated.contentMarkdown!, [{ text: 'stale', vector }]), false);
  const first = await queueDocumentEmbedding(updated); const second = await queueDocumentEmbedding(updated);
  assert.notEqual(first.id, second.id);
  await first.remove(); await second.remove();
});

test('Goal Undo restores associations and respects a deliberate unlink', async () => {
  const goal = await prisma.goal.create({ data: { title: 'Goal', type: 'quarterly', workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const child = await prisma.goal.create({ data: { title: 'Child', type: 'quarterly', parentGoalId: goal.id, metadata: { progressMode: 'auto' }, workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const grandchild = await prisma.goal.create({ data: { title: 'Grandchild', type: 'monthly', parentGoalId: child.id, workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const otherGoal = await prisma.goal.create({ data: { title: 'Unrelated', type: 'quarterly', workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const otherProject = await prisma.project.create({ data: { name: 'Unrelated', goalId: otherGoal.id, workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const project = await prisma.project.create({ data: { name: 'Linked', goalId: child.id, workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const habit = await prisma.habit.create({ data: { name: 'Linked habit', linkedGoalId: goal.id, workspaceId: fixture.workspace.id, createdBy: fixture.user.id, scheduledDays: [1] } });
  await prisma.task.create({ data: { title: 'Done while linked', status: 'DONE', projectId: project.id, workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  await goalService.deleteGoal(goal.id, fixture.workspace.id, fixture.user.id);
  assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).goalId, null);
  assert.equal((await prisma.habit.findUniqueOrThrow({ where: { id: habit.id } })).linkedGoalId, null);
  for (const id of [goal.id, child.id, grandchild.id]) assert.ok((await prisma.goal.findUniqueOrThrow({ where: { id } })).deletedAt);
  assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: otherProject.id } })).goalId, otherGoal.id);
  assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: otherGoal.id } })).deletedAt, null);
  await goalService.restoreGoal(goal.id, fixture.workspace.id, fixture.user.id);
  assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).goalId, child.id);
  assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: child.id } })).progress, 100);
  assert.equal((await prisma.habit.findUniqueOrThrow({ where: { id: habit.id } })).linkedGoalId, goal.id);
  await goalService.deleteGoal(goal.id, fixture.workspace.id, fixture.user.id);
  await habitService.updateHabit(habit.id, fixture.workspace.id, { linkedGoalId: null } as any, fixture.user.id);
  await goalService.restoreGoal(goal.id, fixture.workspace.id, fixture.user.id);
  assert.equal((await prisma.habit.findUniqueOrThrow({ where: { id: habit.id } })).linkedGoalId, null);
});

test('real project deletion preserves milestones; Undo restores only matching deletion', async () => {
  const project = await prisma.project.create({ data: { name: 'Undo', workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
  const milestone = await prisma.milestone.create({ data: { title: 'Milestone', date: new Date(), userId: fixture.user.id, projectId: project.id } });
  const live = await prisma.task.create({ data: { title: 'Live', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, projectId: project.id } });
  const trash = await prisma.task.create({ data: { title: 'Previously deleted', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, projectId: project.id, deletedAt: new Date(0) } });
  const deleted = response(); await deleteProject(request(project.id), deleted as any); assert.equal(deleted.code, 200);
  assert.ok(await prisma.milestone.findUnique({ where: { id: milestone.id } }));
  const restored = response(); await restoreProject(request(project.id), restored as any); assert.equal(restored.code, 200);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: live.id } })).deletedAt, null);
  assert.ok((await prisma.task.findUniqueOrThrow({ where: { id: trash.id } })).deletedAt);
});

test('Focus uses block duration and respects exhausted and small budgets', async () => {
  const date = new Date(); date.setUTCHours(0, 0, 0, 0);
  const task = await prisma.task.create({ data: { title: '120 minute estimate', estimateMinutes: 120, workspaceId: fixture.workspace.id, createdBy: fixture.user.id, scheduledDate: date } });
  await prisma.user.update({ where: { id: fixture.user.id }, data: { weeklyCapacityMinutes: 500 } });
  for (let i = 0; i < 2; i++) await prisma.timeBlock.create({ data: { userId: fixture.user.id, workspaceId: fixture.workspace.id, taskId: task.id, title: '30 minute slot', type: 'WORK', date, startTime: new Date(+date + (9 + i) * 3600000), endTime: new Date(+date + (9 + i) * 3600000 + 1800000) } });
  const schedule = await buildFocusSchedule(fixture.user.id, fixture.workspace.id, {}, 'UTC');
  assert.equal(schedule.totalFocusMinutes, 60);
  await prisma.user.update({ where: { id: fixture.user.id }, data: { weeklyCapacityMinutes: 50 } });
  assert.equal((await buildFocusSchedule(fixture.user.id, fixture.workspace.id, {}, 'UTC')).totalFocusMinutes, 10);
  await prisma.user.update({ where: { id: fixture.user.id }, data: { weeklyCapacityMinutes: 0 } });
  assert.equal((await buildFocusSchedule(fixture.user.id, fixture.workspace.id, {}, 'UTC')).plan.length, 0);
});

test('Focus completion can retry after its task was deleted', async () => {
  const task = await prisma.task.create({ data: { title: 'Deleted', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, deletedAt: new Date() } });
  const data = { completionId: crypto.randomUUID(), taskId: task.id, duration: 60, type: 'pomodoro', startTime: new Date(Date.now() - 60000).toISOString(), endTime: new Date().toISOString() };
  const first = response(); await completeFocusSession(request(undefined, data), first as any);
  const retry = response(); await completeFocusSession(request(undefined, data), retry as any);
  assert.equal(first.code, 201); assert.equal(retry.code, 201);
  assert.equal(await prisma.focusSession.count({ where: { id: data.completionId } }), 1);
});

test('backup includes Brain, versions, planner and history without foreign records or secrets', async () => {
  const backup = await workspaceService.exportWorkspace(fixture.workspace.id);
  assert.equal(backup.formatVersion, 2);
  assert.ok(backup.workspace.spaces.some(space => space.documents.some(d => d.id === doc.id && d.versions.length > 0)));
  assert.equal(backup.workspace.timeBlocks.length, 2);
  assert.ok(backup.workspace.focusSessions.length > 0);
  assert.equal(JSON.stringify(backup).includes(foreignDoc.id), false);
  assert.equal(JSON.stringify(backup).includes('passwordHash'), false);
});

test('real Planner routes exclude deleted and foreign milestones and reject unavailable block links', async () => {
  const app = express(); app.use(express.json()); app.use('/planner', plannerRouter);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const pair = await authService.createSession(fixture.user.id);
  const headers = { Authorization: `Bearer ${pair.accessToken}`, 'x-workspace-id': fixture.workspace.id, 'Content-Type': 'application/json' };
  const call = (method: string, path: string, body?: unknown) => fetch(`http://127.0.0.1:${address.port}/planner${path}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    const project = await prisma.project.create({ data: { name: 'Milestone guard', workspaceId: fixture.workspace.id, createdBy: fixture.user.id } });
    const deletedProject = await prisma.project.create({ data: { name: 'Deleted guard', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, deletedAt: new Date() } });
    const foreignProject = await prisma.project.create({ data: { name: 'Foreign guard', workspaceId: foreignWorkspace.id, createdBy: fixture.user.id } });
    const deletedTask = await prisma.task.create({ data: { title: 'Deleted block link', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, deletedAt: new Date() } });
    const foreignTask = await prisma.task.create({ data: { title: 'Foreign block link', workspaceId: foreignWorkspace.id, createdBy: fixture.user.id } });
    const body = { title: 'Guard regression', date: '2026-10-08', projectId: project.id };
    const created = await call('POST', '/milestones', body); assert.equal(created.status, 201);
    const milestone = await created.json() as any;
    assert.equal((await call('POST', '/milestones', { ...body, projectId: deletedProject.id })).status, 404);
    assert.equal((await call('POST', '/milestones', { ...body, projectId: foreignProject.id })).status, 403);
    for (const target of [deletedProject, foreignProject]) await prisma.milestone.create({ data: { title: 'Hidden', date: new Date('2026-10-08T12:00:00Z'), userId: fixture.user.id, projectId: target.id } });
    const listed = await call('GET', '/milestones?start=2026-10-08&end=2026-10-08'); assert.equal(listed.status, 200);
    const visible = (await listed.json() as any).milestones;
    assert.ok(visible.some((row: any) => row.id === milestone.id));
    assert.ok(visible.every((row: any) => ![deletedProject.id, foreignProject.id].includes(row.projectId)));
    await prisma.project.update({ where: { id: project.id }, data: { deletedAt: new Date() } });
    assert.equal((await call('PATCH', `/milestones/${milestone.id}`, { title: 'Blocked' })).status, 404);
    assert.equal((await call('DELETE', `/milestones/${milestone.id}`)).status, 404);
    const block = { title: 'Unavailable link', date: '2026-10-08', startTime: '15:00', endTime: '15:30', type: 'WORK' };
    for (const link of [{ taskId: deletedTask.id }, { projectId: deletedProject.id }]) {
      assert.equal((await call('POST', '/time-blocks', { ...block, ...link })).status, 404);
    }
    for (const link of [{ taskId: foreignTask.id }, { projectId: foreignProject.id }]) {
      assert.equal((await call('POST', '/time-blocks', { ...block, ...link })).status, 403);
    }
  } finally {
    await authService.revokeSession(pair.refreshToken);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('Planner write routes and full backup enforce roles over HTTP', async () => {
  const app = express(); app.use(express.json()); app.use('/planner', plannerRouter); app.use('/workspaces', workspaceRouter);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const pair = await authService.createSession(fixture.user.id);
  const headers = { Authorization: `Bearer ${pair.accessToken}`, 'x-workspace-id': fixture.workspace.id, 'Content-Type': 'application/json' };
  try {
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'VIEWER' } });
    for (const [method, path] of [['POST', '/milestones'], ['PATCH', '/milestones/unknown'], ['DELETE', '/milestones/unknown'], ['PATCH', '/routine-occurrences']]) {
      const res = await fetch(`http://127.0.0.1:${address.port}/planner${path}`, { method, headers, body: JSON.stringify({ title: 'Unauthorized' }) });
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    const backup = await fetch(`http://127.0.0.1:${address.port}/workspaces/export`, { headers });
    assert.equal(backup.status, 403);
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'GUEST' } });
    const guest = await fetch(`http://127.0.0.1:${address.port}/planner/milestones`, { headers }); assert.equal(guest.status, 403);
  } finally {
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'OWNER' } });
    await authService.revokeSession(pair.refreshToken);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('rotation disconnects old tabs; refreshed tabs connect and logout ends all of them', async () => {
  const io = createRequire(require.resolve('../../../web/package.json'))('socket.io-client').io;
  const server = createServer(); socketService.init(server);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const clients: any[] = [];
  const connect = async (token: string) => {
    const client = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 2000 });
    clients.push(client);
    await Promise.race([once(client, 'connect'), once(client, 'connect_error').then(([error]) => { throw error; })]);
    // Room admission happens after the client connect packet.
    for (let attempt = 0; attempt < 50; attempt++) {
      if (socketService.getIO().sockets.sockets.get(client.id)?.rooms.has(`workspace:${fixture.workspace.id}`)) return client;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Workspace room admission timed out');
  };
  try {
    const pair = await authService.createSession(fixture.user.id);
    const oldTabs = await Promise.all([connect(pair.accessToken), connect(pair.accessToken)]);
    const rotatedEvents = oldTabs.map(client => once(client, 'session:ended'));
    const disconnected = oldTabs.map(client => once(client, 'disconnect'));
    const refreshed = await authService.refresh(pair.refreshToken);
    assert.ok((await Promise.all(rotatedEvents)).every(([event]) => event.reason === 'rotated'));
    await Promise.all(disconnected);
    const freshTabs = await Promise.all([connect(refreshed.accessToken), connect(refreshed.accessToken)]);
    const logoutEvents = freshTabs.map(client => once(client, 'session:ended'));
    const ended = freshTabs.map(client => once(client, 'disconnect'));
    await authService.revokeSession(refreshed.refreshToken);
    assert.ok((await Promise.all(logoutEvents)).every(([event]) => event.reason === 'revoked'));
    await Promise.all(ended);
    assert.ok(freshTabs.every(client => !client.connected));
  } finally {
    clients.forEach(client => client.disconnect());
    await socketService.shutdown();
  }
});

test('session revocation is enforced by another process with a warm cache and a Redis outage', async () => {
  const childSource = `
    const express = require('express');
    const { redisService } = require('./src/services/redis.service.ts');
    const { requireAuth } = require('./src/middlewares/auth.middleware.ts');
    const { prisma } = require('./src/prisma.ts');
    (async () => {
      await redisService.ensureConnected();
      const app = express(); app.get('/protected', requireAuth, (_req, res) => res.json({ accepted: true }));
      const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
      process.on('message', async message => {
        if (message.type === 'outage') {
          redisService.client.disconnect(); redisService.isConnected = false;
          await redisService.set('session_revoked:' + message.sessionId, 'active:' + message.userId, 900);
          process.send({ outage: true });
        }
      });
      process.on('SIGTERM', () => server.close(async () => {
        redisService.client.disconnect(); await prisma.$disconnect();
        await globalThis.pool?.end(); process.exit(0);
      }));
    })().catch(error => { console.error(error); process.exit(1); });
  `;
  const child = spawn(process.execPath, ['--import', 'tsx', '-e', childSource], { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  child.stdout?.resume(); child.stderr?.resume();
  const message = () => new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => { child.off('message', done); reject(new Error('Child process response timed out')); }, 5000);
    const done = (value: any) => { clearTimeout(timer); resolve(value); };
    child.once('message', done);
  });
  try {
    const { port } = await message();
    for (const outage of [false, true]) {
      const pair = await authService.createSession(fixture.user.id);
      const headers = { Authorization: `Bearer ${pair.accessToken}` };
      const call = () => fetch(`http://127.0.0.1:${port}/protected`, { headers });
      assert.equal((await call()).status, 200);
      if (outage) {
        const session = await prisma.session.findUniqueOrThrow({ where: { refreshTokenHash: authService.hashRefreshToken(pair.refreshToken) } });
        const ack = message(); child.send({ type: 'outage', sessionId: session.id, userId: fixture.user.id });
        assert.equal((await ack).outage, true);
      }
      await authService.revokeSession(pair.refreshToken);
      assert.equal((await call()).status, 401);
    }
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) await once(child, 'exit');
  }
});

test('live socket delivery withholds full task data after the connected member becomes a guest', async () => {
  const io = createRequire(require.resolve('../../../web/package.json'))('socket.io-client').io;
  const server = createServer(); socketService.init(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const pair = await authService.createSession(fixture.user.id);
  const client = io(`http://127.0.0.1:${(server.address() as { port: number }).port}`, { auth: { token: pair.accessToken }, transports: ['websocket'], reconnection: false, timeout: 2000 });
  try {
    await Promise.race([once(client, 'connect'), once(client, 'connect_error').then(([error]) => { throw error; })]);
    for (let attempt = 0; attempt < 50 && !socketService.getIO().sockets.sockets.get(client.id)?.rooms.has(fixture.user.id); attempt++) await new Promise(resolve => setTimeout(resolve, 10));
    const received: any[] = []; client.on('task:created', (payload: any) => received.push(payload));
    const ownerMessage = once(client, 'task:created');
    await (socketService as any).emitToReadableWorkspace(fixture.workspace.id, 'task:created', { id: 'owner-control', description: 'private task body' });
    assert.equal((await ownerMessage)[0].id, 'owner-control');
    received.length = 0;
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'GUEST' } });
    await (socketService as any).emitToReadableWorkspace(fixture.workspace.id, 'task:created', { id: 'guest-forbidden', description: 'private task body' });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(received, []);
  } finally {
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'OWNER' } });
    client.disconnect(); await authService.revokeSession(pair.refreshToken); await socketService.shutdown();
  }
});

test('role middleware rejects deleted workspaces and VIEWER writes', async () => {
  await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: fixture.user.id, workspaceId: fixture.workspace.id } }, data: { role: 'VIEWER' } });
  const viewer = response(); let passed = false;
  await requireWorkspaceRole('MEMBER')(request(), viewer as any, () => { passed = true; });
  assert.equal(viewer.code, 403); assert.equal(passed, false);
  await prisma.workspace.update({ where: { id: fixture.workspace.id }, data: { deletedAt: new Date() } });
  const deleted = response(); await requireWorkspaceRole('VIEWER')(request(), deleted as any, () => { passed = true; });
  assert.equal(deleted.code, 403); assert.equal(passed, false);
});

test('personal password changes protect the account, revoke all sessions and permit legacy migration', async () => {
  const oldPassword = 'legacy-password-'.repeat(6); // historical bcrypt truncation
  const legacyHash = await (await import('bcrypt')).default.hash(oldPassword, 4);
  const marker = `password-change-${crypto.randomUUID()}`;
  const user = await prisma.user.create({ data: { email: `${marker}@example.invalid`, name: marker, passwordHash: legacyHash } });
  const { default: router } = await import('../routes/auth.routes');
  const { default: cookieParser } = await import('cookie-parser');
  const app = express(); app.use(express.json()); app.use(cookieParser()); app.use('/auth', router);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/auth`;
  const first = await authService.createSession(user.id);
  const second = await authService.createSession(user.id);
  const change = (body: any, token = first.accessToken) => fetch(`${base}/me/password`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    assert.equal((await change({ currentPassword: oldPassword, newPassword: 'a-secure-new-passphrase' }, 'invalid-token')).status, 401);
    const denied = await change({ currentPassword: 'wrong-password', newPassword: 'a-secure-new-passphrase' });
    assert.equal(denied.status, 400); assert.match((await denied.json() as any).message, /Current password/);
    assert.equal((await change({ currentPassword: oldPassword, newPassword: '\u20ac'.repeat(25) })).status, 400);
    assert.equal((await change({ currentPassword: oldPassword, newPassword: oldPassword.slice(0, 72) })).status, 400);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, legacyHash);
    assert.equal(await prisma.session.count({ where: { userId: user.id, revokedAt: null } }), 2);
    const accepted = await change({ currentPassword: oldPassword, newPassword: 'a-secure-new-passphrase' });
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get('set-cookie') || '', /krama_refresh=;/);
    assert.equal(await prisma.session.count({ where: { userId: user.id, revokedAt: null } }), 0);
    const latest = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(await authService.verifyPassword('a-secure-new-passphrase', latest.passwordHash), true);
    assert.equal(await authService.verifyPassword(oldPassword, latest.passwordHash), false);
    for (const token of [first.accessToken, second.accessToken]) {
      assert.equal((await fetch(`${base}/me`, { headers: { authorization: `Bearer ${token}` } })).status, 401);
    }
    assert.equal((await fetch(`${base}/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: second.refreshToken }) })).status, 401);
    await assert.rejects(authService.createSession(user.id, undefined, undefined, undefined, legacyHash), /Invalid credentials/);
    await assert.rejects(authService.login({ email: user.email, password: oldPassword }), /Invalid credentials/);
    const login = await authService.login({ email: user.email, password: 'a-secure-new-passphrase' });
    assert.ok(login.accessToken);
    await authService.revokeAllSessions(user.id);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('session issuance rechecks credentials after a concurrent password update holds the user lock', async () => {
  const marker = `password-race-${crypto.randomUUID()}`;
  const user = await prisma.user.create({ data: { email: `${marker}@example.invalid`, name: marker, passwordHash: 'old-test-hash' } });
  let release!: () => void;
  let locked!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const acquired = new Promise<void>(resolve => { locked = resolve; });
  const rotation = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    locked(); await gate;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: 'new-test-hash' } });
  });
  try {
    await acquired;
    const issuance = authService.createSession(user.id, undefined, undefined, undefined, 'old-test-hash');
    const rejected = assert.rejects(issuance, /Invalid credentials/);
    release(); await rotation; await rejected;
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  } finally {
    release(); await rotation;
    await prisma.user.delete({ where: { id: user.id } });
  }
});
