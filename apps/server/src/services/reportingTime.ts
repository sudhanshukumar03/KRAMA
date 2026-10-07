import { resolveUserTimeZone } from './habitStreak.service';

export function validDayKey(key: string) {
  const date = new Date(`${key}T12:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

export function shiftDay(key: string, days: number) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function reportingClock(user: { metadata?: any; countryCode?: string | null } | null, requestedZone?: string, requestedOffset?: string) {
  const offset = requestedOffset === undefined ? null : Number(requestedOffset);
  if (offset !== null && (!Number.isInteger(offset) || Math.abs(offset) > 840)) throw new Error('Invalid timezone offset');
  const timeZone = requestedZone || resolveUserTimeZone(user);
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  } catch { throw new Error('Invalid timezone'); }
  const fixedOffset = !requestedZone && offset !== null ? offset : null;
  const dateKey = (date: Date) => {
    if (fixedOffset !== null) return new Date(date.getTime() - fixedOffset * 60_000).toISOString().slice(0, 10);
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const dayStart = (key: string) => {
    if (!validDayKey(key)) throw new Error('Invalid date');
    const wallTime = Date.parse(`${key}T00:00:00.000Z`);
    if (fixedOffset !== null) return new Date(wallTime + fixedOffset * 60_000);
    let guess = wallTime;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
      const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
      const next = guess + wallTime - represented;
      if (next === guess) break;
      guess = next;
    }
    return new Date(guess);
  };
  return { dateKey, dayStart, timeZone };
}
