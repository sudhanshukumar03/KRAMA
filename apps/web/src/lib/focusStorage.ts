import type { PreferencesInput } from '@krama/types/api';

// Anonymous/global keys are deliberately not imported into an authenticated account.
export function focusStorageKey(userId: string | undefined, preference: string) {
  return `krama.focus.${userId ?? 'anonymous'}.${preference}`;
}

interface PendingFocusPreferences { id: string; changes: PreferencesInput; }
const preferenceWrites = new Map<string, Promise<void>>();

export function readPendingFocusPreferences(userId: string | undefined): PendingFocusPreferences | null {
  try {
    const saved = JSON.parse(localStorage.getItem(focusStorageKey(userId, 'pendingPreferences')) || 'null');
    return saved && typeof saved.id === 'string' && saved.changes && typeof saved.changes === 'object' && !Array.isArray(saved.changes) ? saved : null;
  } catch { return null; }
}

export function rememberFocusPreferences(userId: string, changes: PreferencesInput): PendingFocusPreferences {
  const previous = readPendingFocusPreferences(userId)?.changes;
  const pending = { id: crypto.randomUUID(), changes: { ...previous, ...changes,
    ...(changes.timerPreferences ? { timerPreferences: { ...previous?.timerPreferences, ...changes.timerPreferences } } : {}),
  } };
  localStorage.setItem(focusStorageKey(userId, 'pendingPreferences'), JSON.stringify(pending));
  return pending;
}

export function acknowledgeFocusPreferences(userId: string, id: string) {
  // An older response must never clear a newer local edit, even if values repeat.
  if (readPendingFocusPreferences(userId)?.id === id) localStorage.removeItem(focusStorageKey(userId, 'pendingPreferences'));
}

export function enqueueFocusPreferences(userId: string, save: () => Promise<void>): Promise<void> {
  // Share ordering across Focus remounts; a failed write still allows explicit retry.
  const current = (preferenceWrites.get(userId) || Promise.resolve()).catch(() => {}).then(save);
  preferenceWrites.set(userId, current);
  const cleanup = () => { if (preferenceWrites.get(userId) === current) preferenceWrites.delete(userId); };
  void current.then(cleanup, cleanup);
  return current;
}
