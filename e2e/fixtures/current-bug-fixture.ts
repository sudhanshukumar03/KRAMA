import type { BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
const backup = JSON.parse(readFileSync('e2e/fixtures/personal-backup.json', 'utf8'));

export async function bugFixture(context: BrowserContext) {
  const task = { ...backup.workspace.tasks[0], id: 'review-task', title: 'Task to organise', status: 'BACKLOG', metadata: { inbox: true } };
  const doc = { ...backup.workspace.spaces[0].documents[0], id: 'review-document', parentId: null, spaceId: 'review-space', title: 'Review document', documentType: 'NOTE', statusBadges: ['Inbox'],
    tags: [{ tag: { id: 'old-tag', name: 'existing', color: 'blue' } }],
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open linked task', marks: [{ type: 'link', attrs: { href: '#', 'data-entity-type': 'TASK', 'data-entity-id': 'review-task' } }] }] }] },
  };
  const state = { tasks: [task], documents: [doc], deleted: [] as any[], spaces: [{ id: 'review-space', name: 'Current space' }, { id: 'other-space', name: 'Other space' }],
    userId: 'review-user', workspaceId: 'review-workspace', documentsBroken: false, tasksBroken: false, trashBroken: false, trashDelay: 0,
    notifications: [] as any[], olderBroken: false, taskGets: [] as string[], requests: [] as string[] };
  await context.route('**/socket.io/**', route => route.abort());
  await context.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    state.requests.push(method + ' ' + path + url.search);
    const fail = () => route.fulfill({ status: 503, json: { message: 'Synthetic outage' } });
    let data: any = [];
    if (path === '/auth/refresh') data = { accessToken: 'review-token' };
    else if (path === '/auth/me') data = { user: { ...backup.workspace.members[0].user, id: state.userId, memberships: [{ workspaceId: state.workspaceId, role: 'OWNER', workspace: { id: state.workspaceId, name: 'Test workspace' } }] } };
    else if (path === '/workspaces') data = [{ id: state.workspaceId, name: 'Test workspace' }];
    else if (path === '/workspaces/summary') data = {
      openIssues: state.tasks.filter(task => !['DONE','CANCELED'].includes(task.status)).length,
      inbox: state.tasks.filter(task => task.metadata?.inbox && !['DONE','CANCELED'].includes(task.status)).length + state.documents.filter(doc => doc.statusBadges.includes('Inbox')).length,
      projects: 0, goals: 0, habits: 0, documents: state.documents.length,
    };
    else if (path === '/search/recent') data = { results: [
      ...state.tasks.slice(0, 6).map(task => ({ id: task.id, type: 'issue', title: task.title, snippet: '', url: `/app/board?task=${task.id}` })),
      ...state.documents.slice(0, 6).map(doc => ({ id: doc.id, type: 'page', title: doc.title, snippet: '', url: `/app/brain?doc=${doc.id}` })),
    ] };
    else if (path === '/dashboard') data = { dateKey: '2026-10-17', stats: {}, today: { tasks: [] }, habits: [], projects: [], goals: [], activity: [] };
    else if (path === '/spaces') data = state.spaces;
    else if (path === '/tasks') {
      if (state.tasksBroken) return fail();
      const status = url.searchParams.get('status');
      data = state.tasks.filter(item => !status || item.status === status);
    } else if (path === '/tasks/review-task') {
      if (method === 'GET') state.taskGets.push(task.id);
      if (method === 'PATCH') Object.assign(task, route.request().postDataJSON(), { version: task.version + 1 });
      data = task;
    } else if (path === '/documents') {
      const deleted = url.searchParams.get('deleted') === 'true';
      if (deleted && state.trashDelay) await new Promise(resolve => setTimeout(resolve, state.trashDelay));
      if (deleted ? state.trashBroken : state.documentsBroken) return fail();
      const space = url.searchParams.get('spaceId');
      data = { items: (deleted ? state.deleted : state.documents).filter(item => !space || item.spaceId === space), nextCursor: null };
    } else if (path === '/documents/review-document') {
      if (method === 'PATCH') Object.assign(doc, route.request().postDataJSON());
      data = doc;
    } else if (path === '/documents/review-document/content') {
      const body = route.request().postDataJSON();
      doc.contentJson = body.contentJson;
      data = { updatedAt: doc.updatedAt };
    } else if (path === '/documents/review-document/tags') {
      const tag = { id: 'new-tag', name: route.request().postDataJSON().tagName, color: 'blue' };
      doc.tags.push({ tag }); data = tag;
    } else if (path === '/documents/review-document/tags/old-tag') {
      doc.tags = doc.tags.filter((item: any) => item.tag.id !== 'old-tag'); data = { message: 'Removed' };
    } else if (path.endsWith('/links')) data = { incoming: [], outgoing: [] };
    else if (path === '/notifications') {
      const older = url.searchParams.has('cursor');
      if (older && state.olderBroken) return fail();
      data = { items: state.notifications.slice(older ? 50 : 0, older ? 100 : 50), nextCursor: !older && state.notifications.length > 50 ? 'older-page' : null, unreadCount: state.notifications.filter(item => !item.read).length };
    } else if (path === '/notifications/read-all') {
      state.notifications.forEach(item => { item.read = true; }); data = { success: true };
    } else if (path.startsWith('/notifications/') && path.endsWith('/read')) {
      const notification = state.notifications.find(item => item.id === path.split('/')[2]);
      if (notification) notification.read = true;
      data = notification;
    }
    return route.fulfill({ json: data });
  });
  return state;
}

export function seedNotifications(state: Awaited<ReturnType<typeof bugFixture>>) {
  state.notifications = Array.from({ length: 51 }, (_, i) => ({ id: `notification-${i}`, title: i === 50 ? 'Older unread reminder' : `Read notification ${i}`, message: 'A notification message', read: i < 50, createdAt: '2026-10-17T08:00:00Z', actionUrl: i === 50 ? '/app/board?task=review-task' : null }));
}
