import { useCallback } from 'react';
import { toast } from 'sonner';
import { playAudioChime } from '../runtime';
import { rememberFocusCompletion, retireFocusSnapshot, acknowledgeFocusCompletion, chooseFocusCompletion } from '../../../lib/focusRecovery';
import type { CompleteSessionParams } from '../types';
import type { FocusTimer, FocusCompletionQueue, PlannerFocusSession, PlannerFocus } from './types';

interface CompletionInput {
  timer: FocusTimer;
  recovery: FocusCompletionQueue;
  selection: PlannerFocusSession;
  plannerFocus: PlannerFocus;
  userId: string | undefined;
  pendingStorageKey: string;
  ordinaryRecoveryKey: string;
  completeSession: (payload: CompleteSessionParams) => Promise<unknown>;
}
/** Persist a stable completion before sending; advance only after acknowledgement. */
export function useFocusSessionCompletion({ timer, recovery, selection, plannerFocus, userId, pendingStorageKey, ordinaryRecoveryKey, completeSession }: CompletionInput) {
  const {
    setOperatingMode, setCurrentSlotIndex, setMode, setTimeLeft, duration, setDuration,
    setIsActive, startTime, setStartTime, sessionRef, targetEndTimeRef, timeLeftRef,
    currentSlotIndexRef, planRef, modeRef, settingsRef, operatingModeRef
  } = timer;
  const {
    setPendingCompletion, pendingCompletionRef, completionInFlightRef
  } = recovery;
  const {
    selectedSlotRef, setSelectedDialog
  } = selection;
  // Timer complete — uses refs for stable values, no stale closure risk
  const handleCompleteSession = useCallback(async () => {
    if (completionInFlightRef.current) return;
    const activeSession = sessionRef.current;
    if (!activeSession && !pendingCompletionRef.current) return;
    completionInFlightRef.current = true;
    if (activeSession?.runningSince !== null && activeSession?.runningSince !== undefined) {
      activeSession.elapsedMs += Math.max(0, Date.now() - activeSession.runningSince);
      activeSession.runningSince = null;
    }
    const snap_startTime = activeSession?.startTime || startTime;
    const snap_duration = duration;
    const snap_settings = settingsRef.current;
    const snap_operatingMode = operatingModeRef.current;
    const snap_plan = planRef.current;
    const snap_slotIndex = currentSlotIndexRef.current;
    const snap_mode = modeRef.current;

    const elapsedSeconds = activeSession ? Math.max(1, Math.min(activeSession.targetSeconds, Math.floor(activeSession.elapsedMs / 1000))) : snap_duration;

    // Trigger audio chime
    if (snap_settings.soundEnabled) {
      playAudioChime();
    }

    const currentSlot = activeSession?.slot;
    const payload = pendingCompletionRef.current || {
      completionId: activeSession!.id, startTime: (snap_startTime || new Date()).toISOString(),
      endTime: new Date().toISOString(), duration: elapsedSeconds, type: activeSession?.type || snap_mode,
      taskId: currentSlot?.taskId || undefined, projectId: currentSlot?.projectId || undefined,
      plannerSelectionKey: plannerFocus.requested ? plannerFocus.key : undefined,
    };
    pendingCompletionRef.current = payload;
    setPendingCompletion(payload);
    const recovery = { selectionKey: payload.plannerSelectionKey ? 'krama.focus.plan.' + userId + '.' + payload.plannerSelectionKey : undefined, ordinaryKey: ordinaryRecoveryKey };
    try {
      rememberFocusCompletion(pendingStorageKey, payload);
      // Do this before awaiting the request: this component may unmount while it saves.
      if (recovery.selectionKey) retireFocusSnapshot(localStorage, recovery.selectionKey, payload.completionId, true);
      retireFocusSnapshot(sessionStorage, ordinaryRecoveryKey, payload.completionId, false);
    } catch { /* The in-memory draft remains available. */ }
    targetEndTimeRef.current = null; setIsActive(false);
    try {
      // Selection metadata is only for local recovery; the API accepts the
      // original completion contract, and an earlier task cannot advance this one.
      const { plannerSelectionKey: _selectionKey, ...sessionPayload } = payload;
      await completeSession(sessionPayload);
    } catch {
      // Keep the identical payload and slot for explicit retry; never advance on failure.
      completionInFlightRef.current = false;
      return;
    }
    completionInFlightRef.current = false;
    sessionRef.current = null;
    try {
      acknowledgeFocusCompletion(pendingStorageKey, payload.completionId, recovery);
    } catch { /* Keep recovery data if storage cannot be read safely. */ }
    const nextPending = chooseFocusCompletion(pendingStorageKey, plannerFocus.key);
    pendingCompletionRef.current = nextPending; setPendingCompletion(nextPending);

    setStartTime(null);
    sessionRef.current = null;
    targetEndTimeRef.current = null;

    if (plannerFocus.requested) {
      if (selectedSlotRef.current && payload.plannerSelectionKey === plannerFocus.key) {
        timeLeftRef.current = 0; setTimeLeft(0); setSelectedDialog('decision');
      }
      return;
    }

    // Resolve queued saves before starting another work or break session.
    if (nextPending) return;

    // Planner auto-advance or Manual reset
    if (snap_operatingMode === 'planner' && snap_plan.length > 0) {
      const nextIndex = snap_slotIndex + 1;
      if (nextIndex < snap_plan.length) {
        const nextSlot = snap_plan[nextIndex];
        if (nextSlot) {
          setCurrentSlotIndex(nextIndex);
          setMode(nextSlot.type);
          const secs = nextSlot.durationMin * 60;
          setTimeLeft(secs);
          setDuration(secs);

          const shouldAutoStart =
            (nextSlot.type !== 'pomodoro' && snap_settings.autoStartBreaks) ||
            (nextSlot.type === 'pomodoro' && snap_settings.autoStartPomodoros);

          if (shouldAutoStart) {
            const began = new Date();
            sessionRef.current = { id: crypto.randomUUID(), startTime: began, elapsedMs: 0, runningSince: Date.now(), targetSeconds: secs, slot: nextSlot, type: nextSlot.type };
            setStartTime(began);
            targetEndTimeRef.current = Date.now() + secs * 1000;
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        }
      } else {
        // Plan fully completed
        setIsActive(false);
        toast.success('🏆 All planned sessions for today completed!');
        setOperatingMode('manual');
        const defaultSecs = snap_settings.focusDuration * 60;
        setMode('pomodoro');
        setTimeLeft(defaultSecs);
        setDuration(defaultSecs);
      }
    } else {
      // Manual reset
      setIsActive(false);
      const defaultSecs =
        snap_mode === 'pomodoro'
          ? snap_settings.focusDuration * 60
          : snap_mode === 'short_break' ? snap_settings.shortBreak * 60
            : snap_mode === 'custom' ? snap_settings.customDuration * 60 : snap_settings.longBreak * 60;
      setTimeLeft(defaultSecs);
      setDuration(defaultSecs);
    }
  }, [startTime, duration, completeSession, pendingStorageKey, plannerFocus.requested, plannerFocus.key, userId, ordinaryRecoveryKey, setTimeLeft, timeLeftRef, planRef, setSelectedDialog, setMode, setStartTime, targetEndTimeRef, operatingModeRef, setCurrentSlotIndex, setPendingCompletion, setOperatingMode, setDuration, setIsActive, pendingCompletionRef, selectedSlotRef, completionInFlightRef, sessionRef, currentSlotIndexRef, modeRef, settingsRef]);

  return handleCompleteSession;
}
