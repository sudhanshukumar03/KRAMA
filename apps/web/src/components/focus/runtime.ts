import type { ClockDisplay, SessionSlot } from './types';

/** Work and breaks share the reserved budget; the last session uses the remainder. */
export function buildScheduledSessions(totalMinutes: number, workMinutes: number, breakMinutes: number): Pick<SessionSlot, 'type' | 'durationMin'>[] {
  if (![totalMinutes, workMinutes, breakMinutes].every(Number.isInteger) || totalMinutes < 1 || totalMinutes > 1440 || workMinutes < 1 || workMinutes > 1440 || breakMinutes < 0 || breakMinutes > 60) throw new Error('Choose valid whole-minute session lengths.');
  const sessions: Pick<SessionSlot, 'type' | 'durationMin'>[] = [];
  let remaining = totalMinutes;
  while (remaining > 0) {
    const work = Math.min(workMinutes, remaining);
    sessions.push({ type: 'custom', durationMin: work }); remaining -= work;
    if (breakMinutes > 0 && remaining > breakMinutes) {
      sessions.push({ type: 'short_break', durationMin: breakMinutes }); remaining -= breakMinutes;
    }
  }
  return sessions;
}

/** Planner timestamps encode wall-clock time in UTC, independent of the host zone. */
export function plannerResumeTime(date: string, now = new Date()): string | undefined {
  const day = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  if (date !== day) return undefined;
  return date + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':00.000Z';
}

export function getClockDisplay(): ClockDisplay {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const secondsStr = seconds.toString().padStart(2, '0');
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const dayStr = now.toLocaleDateString(undefined, { weekday: 'long' });
  return { timeStr, ampm, secondsStr, dateStr, dayStr };
}

export function playAudioChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.18); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => { void ctx.close().catch(() => {}); };
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch (e) {
    console.warn('Could not play audio chime:', e);
  }
}
