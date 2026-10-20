import { useSyncExternalStore } from 'react';
import { formatLocalDate } from '../lib/utils';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
const dayKey = () => formatLocalDate(new Date()) || '';
function refresh() {
  clearTimeout(timer);
  listeners.forEach(listener => listener());
  const now = new Date();
  const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    }
  };
}

/** One shared midnight/wake listener for every mounted daily habit view. */
export function useLocalDay() {
  return useSyncExternalStore(subscribe, dayKey, () => '');
}
