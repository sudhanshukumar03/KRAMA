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
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
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
