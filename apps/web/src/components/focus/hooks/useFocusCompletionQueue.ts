import { useState, useRef, useEffect } from 'react';
import { readFocusCompletions, chooseFocusCompletion } from '../../../lib/focusRecovery';
import type { RecoverableFocusCompletion, OrdinaryFocusRecovery } from '../../../lib/focusRecovery';
import type { FocusTimer, PlannerFocus } from './types';

interface QueueInput {
  pendingStorageKey: string;
  selectedPlanKey: string;
  ordinaryRecovery: OrdinaryFocusRecovery | null;
  plannerFocus: PlannerFocus;
  sessionRef: FocusTimer['sessionRef'];
}
/** Durable completion ownership and cross-tab discovery, independent of timer ticks. */
export function useFocusCompletionQueue({ pendingStorageKey, selectedPlanKey, ordinaryRecovery, plannerFocus, sessionRef }: QueueInput) {
  /**
   * Scope recovery to both account and workspace so an unsaved completion is
   * retried against its original owner after reload.
   */
  const [pendingCompletion, setPendingCompletion] = useState<RecoverableFocusCompletion | null>(() => {
    const records = readFocusCompletions(pendingStorageKey);
    const own = records.find(item => item.plannerSelectionKey === plannerFocus.key);
    if (own) return own;
    // Another tab's failed save must not replace this tab's recoverable timer.
    if (ordinaryRecovery) return null;
    try { if (plannerFocus.requested && JSON.parse(localStorage.getItem(selectedPlanKey) || 'null')?.session?.id) return null; } catch { }
    return records[0] ?? null;
  });
  const [pendingCount, setPendingCount] = useState(() => readFocusCompletions(pendingStorageKey).length);
  const pendingCompletionRef = useRef<RecoverableFocusCompletion | null>(pendingCompletion);
  const completionInFlightRef = useRef(false);
  useEffect(() => {
    const refreshQueue = () => {
      setPendingCount(readFocusCompletions(pendingStorageKey).length);
      if (!sessionRef.current && !pendingCompletionRef.current && !completionInFlightRef.current) {
        const next = chooseFocusCompletion(pendingStorageKey, plannerFocus.key);
        pendingCompletionRef.current = next; setPendingCompletion(next);
      }
    };
    setPendingCount(readFocusCompletions(pendingStorageKey).length);
    const onStorage = (event: StorageEvent) => { if (event.key === pendingStorageKey || event.key?.startsWith(pendingStorageKey + '.completion.')) refreshQueue(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [pendingStorageKey, plannerFocus.key, pendingCompletion, sessionRef]);

  return { pendingCompletion,setPendingCompletion,pendingCount,pendingCompletionRef,completionInFlightRef };
}
