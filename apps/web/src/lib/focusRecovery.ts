import type { CompleteSessionParams, OperatingMode, SessionSlot, TimerMode } from '../components/focus/types';

export type RecoverableFocusCompletion = CompleteSessionParams & { plannerSelectionKey?: string };
export interface FocusRuntimeSession {
  id: string; startTime: Date; elapsedMs: number; runningSince: number | null;
  targetSeconds: number; slot: SessionSlot | null; type: TimerMode;
}

function validCompletion(value: unknown): value is RecoverableFocusCompletion {
  const item = value as RecoverableFocusCompletion | null;
  return !!item && typeof item.completionId === 'string' && !!item.completionId && Number.isInteger(item.duration) && item.duration > 0 && item.duration <= 86400
    && Number.isFinite(Date.parse(item.startTime)) && Number.isFinite(Date.parse(item.endTime))
    && ['pomodoro', 'custom', 'short_break', 'long_break'].includes(item.type);
}

export function pendingFocusScope(userId: string | undefined, workspaceId: string | null) {
  return `krama.focus.unsaved.${userId}.${workspaceId}`;
}
export function pendingFocusKey(scope: string, id: string) { return `${scope}.completion.${encodeURIComponent(id)}`; }

/** Each completion owns a key: concurrent tabs never rewrite a shared queue. */
export function rememberFocusCompletion(scope: string, completion: RecoverableFocusCompletion) {
  localStorage.setItem(pendingFocusKey(scope, completion.completionId), JSON.stringify(completion));
}

export function readFocusCompletions(scope: string): RecoverableFocusCompletion[] {
  const records = new Map<string, RecoverableFocusCompletion>();
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || (key !== scope && !key.startsWith(scope + '.completion.'))) continue;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (validCompletion(saved)) records.set(saved.completionId, saved);
      } catch { /* One damaged record must not hide the rest of the queue. */ }
    }
  } catch { /* The current tab also retains its in-memory completion. */ }
  return [...records.values()].sort((left, right) => left.startTime.localeCompare(right.startTime) || left.completionId.localeCompare(right.completionId));
}

/** Retire only the matching session; a late response must not erase a newer timer. */
export function retireFocusSnapshot(storage: Storage, key: string, id: string, selection: boolean) {
  const raw = storage.getItem(key);
  let saved;
  try { saved = JSON.parse(raw || 'null'); } catch { return; }
  if (saved?.session?.id !== id) return;
  if (selection) storage.setItem(key, JSON.stringify({ ...saved, session: null, remaining: 0, deadline: null, finished: true }));
  else storage.removeItem(key);
}

export function acknowledgeFocusCompletion(scope: string, id: string, recovery?: { selectionKey?: string; ordinaryKey?: string }) {
  if (recovery?.selectionKey) retireFocusSnapshot(localStorage, recovery.selectionKey, id, true);
  if (recovery?.ordinaryKey) retireFocusSnapshot(sessionStorage, recovery.ordinaryKey, id, false);
  localStorage.removeItem(pendingFocusKey(scope, id));
  // Read old single-record recovery data, but never write new completions there.
  try {
    if (JSON.parse(localStorage.getItem(scope) || 'null')?.completionId === id) localStorage.removeItem(scope);
  } catch { /* Keep malformed legacy data separate from valid queue entries. */ }
}

export function chooseFocusCompletion(scope: string, selectionKey: string): RecoverableFocusCompletion | null {
  const pending = readFocusCompletions(scope);
  return pending.find(item => item.plannerSelectionKey === selectionKey) ?? pending[0] ?? null;
}

export interface OrdinaryFocusRecovery {
  session: FocusRuntimeSession; remaining: number; deadline: number | null;
  operatingMode: OperatingMode; plan: SessionSlot[]; index: number;
}

/** Tab-local active state preserves independent ordinary timers across reloads. */
export function readOrdinaryFocusRecovery(key: string, scope: string): OrdinaryFocusRecovery | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    const active = saved?.session;
    if (!active || typeof active.id !== 'string' || !Number.isFinite(Date.parse(active.startTime)) || !Number.isFinite(active.elapsedMs) || active.elapsedMs < 0
      || !Number.isInteger(active.targetSeconds) || active.targetSeconds < 1 || active.targetSeconds > 86400
      || !['pomodoro', 'custom', 'short_break', 'long_break'].includes(active.type)
      || (active.runningSince !== null && !Number.isFinite(active.runningSince))
      || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > active.targetSeconds
      || (active.runningSince !== null && !Number.isFinite(saved.deadline))
      || !['manual', 'planner'].includes(saved.operatingMode) || !Array.isArray(saved.plan)
      || !Number.isInteger(saved.index) || saved.index < 0) return null;
    if (readFocusCompletions(scope).some(item => item.completionId === active.id)) return null;
    const running = active.runningSince !== null;
    return { session: { ...active, startTime: new Date(active.startTime) },
      remaining: running ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)) : saved.remaining,
      deadline: running ? saved.deadline : null, operatingMode: saved.operatingMode, plan: saved.plan, index: saved.index };
  } catch { return null; }
}
