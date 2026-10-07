import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parses an ISO date string (or YYYY-MM-DD string) into a local Date object,
 * ignoring time zones. This prevents "2023-10-01T00:00:00.000Z" from shifting back
 * to Sept 30th when interpreted in a negative offset time zone.
 */
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const key = dateString.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/**
 * Safely formats a local Date object into a YYYY-MM-DD string.
 */
export function formatLocalDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * TimeBlock startTime/endTime are stored by the server as UTC wall-clock
 * (see createDateTime -> setUTCHours). They must therefore be read back with
 * UTC accessors — reading them with local getHours()/toLocaleTimeString shifts
 * the displayed time by the viewer's UTC offset (e.g. 09:00 -> 14:30 in IST).
 * Accepts either an ISO datetime string or a plain "HH:mm" string, and returns
 * minutes-since-midnight of that wall-clock time (or null if unparseable).
 */
export function blockMinutesOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  if (value.includes('T')) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  if (value.includes(':')) {
    const [h, m] = value.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return null;
}

/**
 * Formats a stored time-block time (ISO or "HH:mm") as a "HH:mm" wall-clock
 * string using UTC accessors. Returns '' when the input can't be parsed.
 */
export function formatBlockTime(value: string | null | undefined): string {
  const mins = blockMinutesOfDay(value);
  if (mins === null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
