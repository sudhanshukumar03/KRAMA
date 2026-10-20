import { useState, useRef, useEffect } from 'react';
import { focusStorageKey } from '../../../lib/focusStorage';
import type { OrdinaryFocusRecovery, FocusRuntimeSession } from '../../../lib/focusRecovery';
import type { TimerSettings, OperatingMode, TimerMode, SessionSlot } from '../types';

/** Runtime state is separate from persistence, completion writes and presentation. */
export function useFocusTimerState(settings: TimerSettings, ordinaryRecovery: OrdinaryFocusRecovery | null, userId: string | undefined) {
  // Operating Mode
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(() => {
    if (ordinaryRecovery) return ordinaryRecovery.operatingMode;
    try {
      const saved = localStorage.getItem(focusStorageKey(userId, 'mode')) as OperatingMode;
      if (saved === 'manual' || saved === 'planner') return saved;
    } catch { }
    return 'planner';
  });

  // Planner Schedule State
  const [plan, setPlan] = useState<SessionSlot[]>(ordinaryRecovery?.plan ?? []);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(ordinaryRecovery?.index ?? 0);

  // Timer Machine State
  const [mode, setMode] = useState<TimerMode>(ordinaryRecovery?.session.type ?? 'pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(() => ordinaryRecovery?.remaining ?? settings.focusDuration * 60);
  const [duration, setDuration] = useState<number>(() => ordinaryRecovery?.session.targetSeconds ?? settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(!!ordinaryRecovery && ordinaryRecovery.session.runningSince !== null);
  const [startTime, setStartTime] = useState<Date | null>(ordinaryRecovery?.session.startTime ?? null);
  /**
   * Freeze the started session's identity, task and slot across Planner refreshes.
   * elapsedMs accumulates running time only, so paused time is excluded from logs.
   */
  const sessionRef = useRef<FocusRuntimeSession | null>(ordinaryRecovery?.session ?? null);
  const targetEndTimeRef = useRef<number | null>(ordinaryRecovery?.deadline ?? null);
  const timeLeftRef = useRef<number>(timeLeft);
  // Stable refs so countdown tick always reads latest values (avoids stale closure)
  const currentSlotIndexRef = useRef<number>(currentSlotIndex);
  const planRef = useRef<SessionSlot[]>(plan);
  const modeRef = useRef<TimerMode>(mode);
  const settingsRef = useRef<TimerSettings>(settings);
  const operatingModeRef = useRef<OperatingMode>(operatingMode);
  const isActiveRef = useRef<boolean>(isActive);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { currentSlotIndexRef.current = currentSlotIndex; }, [currentSlotIndex]);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { operatingModeRef.current = operatingMode; }, [operatingMode]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  return { operatingMode,setOperatingMode,plan,setPlan,currentSlotIndex,setCurrentSlotIndex,mode,setMode,timeLeft,setTimeLeft,duration,setDuration,isActive,setIsActive,startTime,setStartTime,sessionRef,targetEndTimeRef,timeLeftRef,currentSlotIndexRef,planRef,modeRef,settingsRef,operatingModeRef,isActiveRef };
}
