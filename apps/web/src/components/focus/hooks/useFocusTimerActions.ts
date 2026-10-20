import { useCallback } from 'react';
import { toast } from 'sonner';
import { focusStorageKey } from '../../../lib/focusStorage';
import type { TimerMode, TimerSettings } from '../types';
import type { FocusTimer, FocusCompletionQueue, PlannerFocusSession, PlannerFocus, FocusPreferences } from './types';
import type { useFocusSchedule } from '../../../hooks/useFocusSchedule';

interface ActionsInput {
  timer: FocusTimer;
  recovery: FocusCompletionQueue;
  selection: PlannerFocusSession;
  plannerFocus: PlannerFocus;
  preferences: FocusPreferences;
  userId: string | undefined;
  handleCompleteSession: () => Promise<void>;
  refetchSchedule: ReturnType<typeof useFocusSchedule>['refetchSchedule'];
}
/** Explicit timer commands preserve active ownership and pending-save guards. */
export function useFocusTimerActions({ timer, recovery, selection, plannerFocus, preferences, userId, handleCompleteSession, refetchSchedule }: ActionsInput) {
  const {
    operatingMode, setOperatingMode, plan, setPlan, currentSlotIndex, setCurrentSlotIndex, mode,
    setMode, setTimeLeft, duration, setDuration, isActive, setIsActive, setStartTime,
    sessionRef, targetEndTimeRef, timeLeftRef, currentSlotIndexRef, planRef, modeRef, settingsRef,
    operatingModeRef, isActiveRef
  } = timer;
  const {
    pendingCompletionRef, completionInFlightRef
  } = recovery;
  const {
    selectedSlotRef, selectedIndex, selectedDialog, selectedFinished, selectedBusy,
    configureSelected
  } = selection;
  const { settings,setSettings,syncPreferences } = preferences;
  const handleSkip = useCallback(() => {
    if (selectedSlotRef.current) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    targetEndTimeRef.current = null;
    setIsActive(false);
    setStartTime(null);
    sessionRef.current = null;
    if (operatingMode === 'planner' && plan.length > 0) {
      // Linear advance — same logic as handleCompleteSession, no wrap-around
      const nextIndex = currentSlotIndex + 1;
      if (nextIndex < plan.length) {
        const targetSlot = plan[nextIndex];
        if (!targetSlot) return;
        setCurrentSlotIndex(nextIndex);
        setMode(targetSlot.type);
        const secs = targetSlot.durationMin * 60;
        setTimeLeft(secs);
        setDuration(secs);
      } else {
        // Was last slot — finish plan
        toast.success('🏆 All planned sessions for today completed!');
        setOperatingMode('manual');
        const defaultSecs = settings.focusDuration * 60;
        setMode('pomodoro');
        setTimeLeft(defaultSecs);
        setDuration(defaultSecs);
      }
    }
  }, [operatingMode, plan, currentSlotIndex, settings.focusDuration, pendingCompletionRef, setMode, setIsActive, setStartTime, setCurrentSlotIndex, selectedSlotRef, targetEndTimeRef, setOperatingMode, completionInFlightRef, setTimeLeft, sessionRef, setDuration]);

  // Control handlers
  const handleStart = useCallback(() => {
    if (plannerFocus.requested && (plannerFocus.loading || plannerFocus.invalid || plannerFocus.blocker || selectedDialog || selectedFinished || timeLeftRef.current <= 0 || selectedBusy)) return;
    if (isActiveRef.current || mode === 'clock' || pendingCompletionRef.current || completionInFlightRef.current) return;
    if (!sessionRef.current) {
      const began = new Date();
      sessionRef.current = { id: crypto.randomUUID(), startTime: began, elapsedMs: 0, runningSince: null, targetSeconds: duration, slot: selectedSlotRef.current || (operatingModeRef.current === 'planner' ? planRef.current[currentSlotIndexRef.current] || null : null), type: modeRef.current };
      setStartTime(began);
    }
    sessionRef.current.runningSince = Date.now();
    targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    setIsActive(true);
  }, [mode, duration, plannerFocus.requested, plannerFocus.loading, plannerFocus.invalid, plannerFocus.blocker, selectedDialog, selectedFinished, selectedBusy, timeLeftRef, pendingCompletionRef, planRef, setIsActive, setStartTime, isActiveRef, selectedSlotRef, operatingModeRef, completionInFlightRef, sessionRef, currentSlotIndexRef, modeRef, targetEndTimeRef]);

  const handlePause = useCallback(() => {
    const active = sessionRef.current;
    if (active?.runningSince !== null && active?.runningSince !== undefined) {
      active.elapsedMs += Math.max(0, Date.now() - active.runningSince); active.runningSince = null;
    }
    if (targetEndTimeRef.current) { const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000)); timeLeftRef.current = remaining; setTimeLeft(remaining); }
    targetEndTimeRef.current = null;
    setIsActive(false);
  }, [timeLeftRef, targetEndTimeRef, setTimeLeft, sessionRef, setIsActive]);

  const handleStop = () => {
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    targetEndTimeRef.current = null;
    setIsActive(false);
    // In planner mode, let handleCompleteSession handle the advance + reset.
    // In manual mode, reset the current slot.
    if (selectedSlotRef.current || (operatingModeRef.current === 'planner' && planRef.current.length > 0)) {
      handleCompleteSession();
    } else {
      setStartTime(null); sessionRef.current = null;
      const secs =
        modeRef.current === 'pomodoro'
          ? settingsRef.current.focusDuration * 60
          : modeRef.current === 'short_break'
            ? settingsRef.current.shortBreak * 60
            : modeRef.current === 'long_break'
              ? settingsRef.current.longBreak * 60
              : modeRef.current === 'custom'
                ? (settingsRef.current.customDuration || 45) * 60
                : 0;
      setTimeLeft(secs);
      setDuration(secs);
    }
  };

  const handleChangeMode = (newMode: TimerMode) => {
    if (plannerFocus.requested) { toast.info("Use the task session plan, or return to Planner."); return; }
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem(focusStorageKey(userId, 'mode'), 'manual');
    }
    targetEndTimeRef.current = null;
    setMode(newMode);
    setIsActive(false);
    setStartTime(null);
    sessionRef.current = null;
    let secs = 0;
    if (newMode === 'pomodoro') {
      secs = settings.focusDuration * 60;
    } else if (newMode === 'short_break') {
      secs = settings.shortBreak * 60;
    } else if (newMode === 'long_break') {
      secs = settings.longBreak * 60;
    } else if (newMode === 'custom') {
      secs = (settings.customDuration || 45) * 60;
    } else if (newMode === 'clock') {
      secs = 0;
    }
    setTimeLeft(secs);
    setDuration(secs);
  };

  const handleSetCustomDuration = (mins: number) => {
    if (plannerFocus.requested) { if (!sessionRef.current && selectedIndex === 0 && !pendingCompletionRef.current) configureSelected(mins, 0); return; }
    const validMins = Math.max(1, mins);
    const updated = { ...settings, customDuration: validMins };
    setSettings(updated);
    localStorage.setItem(focusStorageKey(userId, 'settings'), JSON.stringify(updated));
    if (mode === 'custom' && !isActive && !sessionRef.current && !pendingCompletionRef.current) {
      setTimeLeft(validMins * 60);
      setDuration(validMins * 60);
    }
  };

  const handleSelectSlot = (idx: number) => {
    if (plannerFocus.requested) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    targetEndTimeRef.current = null;
    const targetSlot = plan[idx];
    if (!targetSlot) return;
    setCurrentSlotIndex(idx);
    setMode(targetSlot.type);
    const secs = targetSlot.durationMin * 60;
    setTimeLeft(secs);
    setDuration(secs);
    setIsActive(false);
    setStartTime(null);
    sessionRef.current = null;
  };

  const handleToggleMode = () => {
    if (plannerFocus.requested) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem(focusStorageKey(userId, 'mode'), 'manual');
      // Directly reset timer — can't call handleChangeMode here because
      // operatingMode state hasn't updated yet (it still reads 'planner')
      targetEndTimeRef.current = null;
      setMode('pomodoro');
      setIsActive(false);
      setStartTime(null);
    sessionRef.current = null;
      const secs = settingsRef.current.focusDuration * 60;
      setTimeLeft(secs);
      setDuration(secs);
    } else {
      setOperatingMode('planner');
      localStorage.setItem(focusStorageKey(userId, 'mode'), 'planner');
      refetchSchedule().then((res) => {
        const planData = res.data?.plan;
        if (planData && planData.length > 0) {
          setPlan(planData);
          setCurrentSlotIndex(0);
          const firstSlot = planData[0];
          if (firstSlot) {
            setMode(firstSlot.type);
            const initialSecs = firstSlot.durationMin * 60;
            setTimeLeft(initialSecs);
            setDuration(initialSecs);
          }
        }
      });
    }
  };

  const handleSaveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    localStorage.setItem(focusStorageKey(userId, 'settings'), JSON.stringify(newSettings));
    if (!plannerFocus.requested && !isActive && !sessionRef.current && !pendingCompletionRef.current) {
      const secs =
        mode === 'pomodoro'
          ? newSettings.focusDuration * 60
          : mode === 'short_break'
            ? newSettings.shortBreak * 60
            : mode === 'long_break'
              ? newSettings.longBreak * 60
              : mode === 'custom'
                ? (newSettings.customDuration || 45) * 60
                : 0;
      setTimeLeft(secs);
      setDuration(secs);
    }
    syncPreferences({ timerPreferences: {
      focusDuration: newSettings.focusDuration, shortBreak: newSettings.shortBreak,
      longBreak: newSettings.longBreak, longBreakAfter: newSettings.longBreakAfter,
    } }, 'Settings saved on this device. Account sync failed; try saving again.');
  };

  return { handleSkip, handleStart, handlePause, handleStop, handleChangeMode, handleSetCustomDuration, handleSelectSlot, handleToggleMode, handleSaveSettings };
}
