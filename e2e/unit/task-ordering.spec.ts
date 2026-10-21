import { test, expect } from '@playwright/test';
import { taskPositionForMove } from '../../apps/web/src/components/kanban/taskOrdering';
import { createHabitsApi } from '../../apps/web/src/api/habitsApi';
import type { JsonRequest } from '../../apps/web/src/api/request';

const task = (id: string, position: number, status = 'TODO') => ({ id, position, status });

test('filtered moves use hidden neighbors before and after the visible anchor', () => {
  const tasks = [task('a', 1000), task('hidden', 2000), task('b', 3000), task('moving', 4000)];
  expect(taskPositionForMove(tasks, 'moving', 'TODO', 'a', 'after')).toBe(1500);
  expect(taskPositionForMove(tasks, 'moving', 'TODO', 'b', 'before')).toBe(2500);
  expect(tasks.map(task => task.position)).toEqual([1000, 2000, 3000, 4000]);
});

test('column drops append after hidden cards, including across statuses', () => {
  const tasks = [task('a', 1000), task('hidden', 2000), task('moving', 5000, 'BACKLOG')];
  expect(taskPositionForMove(tasks, 'moving', 'TODO')).toBe(3000);
  expect(taskPositionForMove(tasks, 'moving', 'DONE')).toBe(1000);
});

test('adjacent moves work in both directions and ignore the moving task position', () => {
  const tasks = [task('a', 1000), task('b', 2000), task('c', 3000)];
  expect(taskPositionForMove(tasks, 'a', 'TODO', 'b', 'after')).toBe(2500);
  expect(taskPositionForMove(tasks, 'c', 'TODO', 'b', 'before')).toBe(1500);
  expect(taskPositionForMove(tasks, 'c', 'TODO', 'a', 'before')).toBe(0);
});

test('crowded positions and missing anchors do not produce collisions', () => {
  expect(taskPositionForMove([task('a', 1), task('b', 1 + Number.EPSILON)], 'moving', 'TODO', 'b')).toBeNull();
  expect(taskPositionForMove([task('a', 1), task('b', 1)], 'moving', 'TODO', 'b')).toBeNull();
  expect(taskPositionForMove([], 'moving', 'TODO', 'missing')).toBeNull();
});

test('habit completion preserves an ISO-only payload and the optional today default', async () => {
  const calls: Array<{ endpoint: string; options?: RequestInit }> = [];
  const request: JsonRequest = async <T>(endpoint: string, options?: RequestInit) => {
    calls.push({ endpoint, options }); return {} as T;
  };
  const api = createHabitsApi(request);
  const dateIso = '2026-10-21T12:00:00.000Z';
  await api.complete('habit', undefined, dateIso);
  expect(calls[0].endpoint).toBe('/habits/habit/log');
  expect(JSON.parse(String(calls[0].options?.body))).toEqual({ dateIso });
  await api.complete('habit', '2026-10-21', dateIso);
  expect(JSON.parse(String(calls[1].options?.body))).toEqual({ date: '2026-10-21', dateIso });
  await api.complete('habit');
  expect(calls[2].options?.body).toBeUndefined();
});
