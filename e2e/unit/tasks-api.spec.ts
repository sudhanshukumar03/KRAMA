import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createTasksApi } from '../../apps/web/src/api/tasksApi';
import type { IssueWithRelations } from '../../apps/web/src/types/schema';
import type { JsonRequest } from '../../apps/web/src/api/request';

const backup = JSON.parse(readFileSync('e2e/fixtures/personal-backup.json', 'utf8'));
const task = (id: string, position: number): IssueWithRelations => ({ ...backup.workspace.tasks[0], id, title: id, position, estimateMinutes: 0 });
test('task page adapter preserves complete position ordering and zero estimates', async () => {
  const calls: string[] = [];
  const pages = [{ items: [task('a', 30), task('b', 10)], nextCursor: 'b' }, { items: [task('c', 20)], nextCursor: null }];
  const request: JsonRequest = async <T>(endpoint: string) => { calls.push(endpoint); return pages.shift() as T; };
  const tasks = await createTasksApi(request).list({ status: 'TODO' });
  expect(tasks.map(task => task.id)).toEqual(['b', 'c', 'a']);
  expect(tasks.every(task => task.estimateMinutes === 0)).toBe(true);
  expect(new URL(calls[1], 'http://localhost').searchParams.get('cursor')).toBe('b');
  expect(new URL(calls[1], 'http://localhost').searchParams.get('status')).toBe('TODO');
});
test('a later page failure does not publish a partial task collection', async () => {
  let calls = 0;
  const request: JsonRequest = async <T>() => {
    if (calls++) throw new Error('Synthetic second-page outage');
    return { items: [task('a', 10)], nextCursor: 'a' } as T;
  };
  await expect(createTasksApi(request).list()).rejects.toThrow('Synthetic second-page outage');
});
test('legacy arrays remain compatible and repeated cursors stop safely', async () => {
  const legacy: JsonRequest = async <T>() => [task('legacy', 0)] as T;
  expect((await createTasksApi(legacy).list()).map(task => task.id)).toEqual(['legacy']);
  let calls = 0;
  const repeated: JsonRequest = async <T>() => { calls++; return { items: [task('a', 10)], nextCursor: 'a' } as T; };
  await expect(createTasksApi(repeated).list()).rejects.toThrow('server repeated a page');
  expect(calls).toBe(2);
});
