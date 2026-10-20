import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePlannerFocus } from '../../../hooks/usePlannerFocus';
import { useFocusSchedule } from '../../../hooks/useFocusSchedule';
import { pendingFocusScope, readOrdinaryFocusRecovery } from '../../../lib/focusRecovery';
import type { SessionSlot } from '../types';
import type { FocusPreferences } from './types';
import { useFocusTimerState } from './useFocusTimerState';
import { useFocusCompletionQueue } from './useFocusCompletionQueue';
import { usePlannerFocusSession } from './usePlannerFocusSession';
import { useFocusSessionCompletion } from './useFocusSessionCompletion';
import { useFocusTimerActions } from './useFocusTimerActions';
import { useFocusCountdown } from './useFocusCountdown';

/** Compose independently owned timer, recovery, Planner selection and write lifecycles. */
export function useFocusSession(preferences: FocusPreferences) {
  const { user, workspaceId } = useAuth();
  const plannerFocus = usePlannerFocus();
  const { schedule, refetchSchedule, completeSession, isCompleting } = useFocusSchedule();
  const selectedPlanKey = 'krama.focus.plan.' + user?.id + '.' + plannerFocus.key;
  const pendingStorageKey = pendingFocusScope(user?.id, workspaceId);
  const ordinaryRecoveryKey = `krama.focus.active.${user?.id}.${workspaceId}`;
  const [ordinaryRecovery] = useState(() => plannerFocus.requested ? null : readOrdinaryFocusRecovery(ordinaryRecoveryKey, pendingStorageKey));
  const timer = useFocusTimerState(preferences.settings, ordinaryRecovery, user?.id);
  const recovery = useFocusCompletionQueue({ pendingStorageKey, selectedPlanKey, ordinaryRecovery, plannerFocus, sessionRef: timer.sessionRef });
  const selection = usePlannerFocusSession({ timer, recovery, plannerFocus, selectedPlanKey, workspaceId });
  const handleCompleteSession = useFocusSessionCompletion({ timer, recovery, selection, plannerFocus, pendingStorageKey, ordinaryRecoveryKey, userId: user?.id, completeSession });
  const actions = useFocusTimerActions({ timer, recovery, selection, plannerFocus, preferences, userId: user?.id, handleCompleteSession, refetchSchedule });
  const {
    operatingMode, plan, setPlan, currentSlotIndex, setCurrentSlotIndex, setMode, timeLeft,
    setTimeLeft, setDuration, isActive, sessionRef, targetEndTimeRef, currentSlotIndexRef, planRef,
    operatingModeRef
  } = timer;
  const {
    pendingCompletion, pendingCompletionRef, completionInFlightRef
  } = recovery;
  useEffect(() => {
    if (plannerFocus.requested) return;
    try {
      if (sessionRef.current && !pendingCompletion) sessionStorage.setItem(ordinaryRecoveryKey, JSON.stringify({ session: sessionRef.current, remaining: timeLeft, deadline: targetEndTimeRef.current, operatingMode, plan, index: currentSlotIndex }));
      else sessionStorage.removeItem(ordinaryRecoveryKey);
    } catch { /* The live timer remains available if tab storage is unavailable. */ }
  }, [ordinaryRecoveryKey, plannerFocus.requested, timeLeft, isActive, pendingCompletion, operatingMode, plan, currentSlotIndex, sessionRef, targetEndTimeRef]);

  // Keep an active/paused session and an unsaved completion bound to its original
  // task. Apply incoming schedule changes only when the timer is idle.
  useEffect(() => {
    if (plannerFocus.requested || !schedule || sessionRef.current || pendingCompletionRef.current || completionInFlightRef.current) return;
    const incoming = schedule.plan || [];
    const previous = planRef.current[currentSlotIndexRef.current];
    const sameSlot = (slot: SessionSlot) => previous && slot.taskId === previous.taskId && slot.timeBlockId === previous.timeBlockId && slot.type === previous.type && slot.label === previous.label;
    const match = incoming.findIndex(sameSlot);
    const nextIndex = match >= 0 ? match : 0;
    setPlan(incoming);
    setCurrentSlotIndex(nextIndex);
    if (operatingModeRef.current === 'planner' && incoming[nextIndex]) {
      const slot = incoming[nextIndex]; setMode(slot.type);
      setTimeLeft(slot.durationMin * 60); setDuration(slot.durationMin * 60);
    }
  }, [schedule, pendingCompletion, plannerFocus.requested, setTimeLeft, sessionRef, planRef, completionInFlightRef, operatingModeRef, setMode, pendingCompletionRef, setCurrentSlotIndex, setDuration, currentSlotIndexRef, setPlan]);

  useFocusCountdown(timer, handleCompleteSession);
  return { ...timer, ...recovery, ...selection, ...actions, plannerFocus, isCompleting, handleCompleteSession };
}
