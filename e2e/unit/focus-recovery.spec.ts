import { test, expect } from '@playwright/test';
import { acknowledgeFocusCompletion, pendingFocusKey, pendingFocusScope, readFocusCompletions, readOrdinaryFocusRecovery, rememberFocusCompletion, retireFocusSnapshot } from '../../apps/web/src/lib/focusRecovery';

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; }, key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null, setItem: (key, value) => { items.set(key, value); },
    removeItem: key => { items.delete(key); }, clear: () => items.clear(),
  };
}
const completion = (completionId: string) => ({ completionId, startTime: '2026-10-15T09:00:00Z', endTime: '2026-10-15T09:25:00Z', duration: 1500, type: 'pomodoro' as const });
const scope = pendingFocusScope('user', 'workspace');
let previousLocal: PropertyDescriptor | undefined;
let previousSession: PropertyDescriptor | undefined;
test.beforeEach(() => {
  previousLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  previousSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage() });
});
test.afterEach(() => {
  if (previousLocal) Object.defineProperty(globalThis, 'localStorage', previousLocal); else Reflect.deleteProperty(globalThis, 'localStorage');
  if (previousSession) Object.defineProperty(globalThis, 'sessionStorage', previousSession); else Reflect.deleteProperty(globalThis, 'sessionStorage');
});

test('completion recovery isolates each ID, account, and workspace', () => {
  rememberFocusCompletion(scope, completion('one')); rememberFocusCompletion(scope, completion('two'));
  rememberFocusCompletion(pendingFocusScope('other-user', 'workspace'), completion('other'));
  rememberFocusCompletion(pendingFocusScope('user', 'other-workspace'), completion('elsewhere'));
  acknowledgeFocusCompletion(scope, 'one');
  expect(readFocusCompletions(scope).map(item => item.completionId)).toEqual(['two']);
  expect(localStorage.length).toBe(3);
});
test('corrupt records do not hide valid or legacy recovery records', () => {
  localStorage.setItem(scope, JSON.stringify(completion('legacy')));
  rememberFocusCompletion(scope, completion('current'));
  localStorage.setItem(pendingFocusKey(scope, 'broken'), '{');
  localStorage.setItem(pendingFocusKey(scope, 'invalid'), JSON.stringify({ ...completion('invalid'), duration: -1 }));
  expect(readFocusCompletions(scope).map(item => item.completionId)).toEqual(['current', 'legacy']);
  acknowledgeFocusCompletion(scope, 'current');
  expect(JSON.parse(localStorage.getItem(scope)!).completionId).toBe('legacy');
  acknowledgeFocusCompletion(scope, 'legacy'); expect(localStorage.getItem(scope)).toBeNull();
});
test('ordinary recovery preserves active time and paused time separately', () => {
  const session = { id: 'active', startTime: new Date(), elapsedMs: 60000, runningSince: Date.now(), targetSeconds: 1500, slot: null, type: 'pomodoro' };
  const state = { session, remaining: 1440, deadline: Date.now() + 1_400_000, operatingMode: 'manual', plan: [], index: 0 };
  sessionStorage.setItem('active-key', JSON.stringify(state));
  expect(readOrdinaryFocusRecovery('active-key', scope)).toMatchObject({ session: { id: 'active', elapsedMs: 60000 }, remaining: 1400 });
  sessionStorage.setItem('active-key', JSON.stringify({ ...state, session: { ...session, runningSince: null }, deadline: null }));
  expect(readOrdinaryFocusRecovery('active-key', scope)?.remaining).toBe(1440);
});
test('an already queued completion cannot revive its stale active timer', () => {
  rememberFocusCompletion(scope, completion('finished'));
  sessionStorage.setItem('active-key', JSON.stringify({ session: { id: 'finished', startTime: new Date(), elapsedMs: 60000, runningSince: null, targetSeconds: 1500, slot: null, type: 'pomodoro' }, remaining: 1440, deadline: null, operatingMode: 'manual', plan: [], index: 0 }));
  expect(readOrdinaryFocusRecovery('active-key', scope)).toBeNull();
});

test('acknowledgement retires only the matching active snapshot', () => {
  const selected = { session: { id: 'finished' }, sessions: [{ type: 'custom', durationMin: 25 }], index: 0, remaining: 0, deadline: null };
  localStorage.setItem('selected', JSON.stringify(selected));
  sessionStorage.setItem('ordinary', JSON.stringify({ session: { id: 'newer' } }));
  rememberFocusCompletion(scope, completion('finished'));
  acknowledgeFocusCompletion(scope, 'finished', { selectionKey: 'selected', ordinaryKey: 'ordinary' });
  expect(JSON.parse(localStorage.getItem('selected')!)).toMatchObject({ session: null, finished: true, remaining: 0, index: 0 });
  expect(JSON.parse(sessionStorage.getItem('ordinary')!).session.id).toBe('newer');
  expect(readFocusCompletions(scope)).toHaveLength(0);
});
test('late responses cannot erase a newer selection or a newer pending save', () => {
  localStorage.setItem('selected', JSON.stringify({ session: { id: 'newer' }, remaining: 900 }));
  rememberFocusCompletion(scope, completion('older')); rememberFocusCompletion(scope, completion('newer'));
  acknowledgeFocusCompletion(scope, 'older', { selectionKey: 'selected' });
  expect(JSON.parse(localStorage.getItem('selected')!)).toEqual({ session: { id: 'newer' }, remaining: 900 });
  expect(readFocusCompletions(scope).map(item => item.completionId)).toEqual(['newer']);
});
test('retiring ordinary work removes its tab snapshot and ignores damaged snapshots', () => {
  sessionStorage.setItem('ordinary', JSON.stringify({ session: { id: 'finished' } }));
  retireFocusSnapshot(sessionStorage, 'ordinary', 'finished', false);
  expect(sessionStorage.getItem('ordinary')).toBeNull();
  localStorage.setItem('damaged', '{'); rememberFocusCompletion(scope, completion('finished'));
  acknowledgeFocusCompletion(scope, 'finished', { selectionKey: 'damaged' });
  expect(readFocusCompletions(scope)).toHaveLength(0);
});
