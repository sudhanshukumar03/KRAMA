import { useEffect } from 'react';
import type { FocusTimer } from './types';

/** Timestamp-based ticks and visibility recovery share the same completion guard. */
export function useFocusCountdown(timer: FocusTimer, handleCompleteSession: () => Promise<void>) {
  const { isActive, targetEndTimeRef, timeLeftRef, setTimeLeft, setIsActive } = timer;
  // Drift-free countdown loop using timestamp deltas
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
      }

      const tick = () => {
        if (!targetEndTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          targetEndTimeRef.current = null;
          setIsActive(false);
          handleCompleteSession();
        }
      };

      tick();
      interval = setInterval(tick, 500);
    } else {
      targetEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, handleCompleteSession, targetEndTimeRef, timeLeftRef, setTimeLeft, setIsActive]);

  // Immediately recalculate on tab visibility change (e.g. user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && targetEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          targetEndTimeRef.current = null;
          setIsActive(false);
          handleCompleteSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, handleCompleteSession, targetEndTimeRef, timeLeftRef, setTimeLeft, setIsActive]);

}
