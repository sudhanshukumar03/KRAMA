import { z } from 'zod';
import { DATE_KEY_RE } from './dateKey';

// =============================================================================
// PLANNER VALIDATION SCHEMAS — KRAMA OS
// =============================================================================
// Shared, single source of truth for the planner API's request shapes. Mirrors
// the HabitLogSchema approach: validation lives here (not inline in the routes)
// so date-format gaps are closed consistently and both server and web compile
// against the same contract.

// A strict calendar-day key ('YYYY-MM-DD'). Query params that must be day keys
// use this so an unparseable value is rejected at the edge with a 400 instead
// of flowing through as an Invalid Date and surfacing as a 500 later.
const dateKeyString = z
  .string()
  .regex(DATE_KEY_RE, 'date must be in YYYY-MM-DD format')
  .refine(key => {
    const date = new Date(`${key}T12:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
  }, 'date must be a real calendar day');

// A date the client may send either as a bare day key or as a full ISO instant
// (TimeBlock/milestone dates ride as `${key}T12:00:00.000Z`). z.coerce.date()
// accepts both and rejects anything that parses to an Invalid Date.
const flexibleDate = z.union([z.date(), z.string().refine(value => dateKeyString.safeParse(value.split('T')[0]).success, 'date must be a real calendar day')]).pipe(z.coerce.date());

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// Must stay in sync with the TimeBlockType enum in schema.prisma (no automated
// enforcement — this is a manual mirror).
export const TIME_BLOCK_TYPES = [
  'MEETING',
  'PERSONAL',
  'STUDY',
  'WORK',
  'HEALTH',
  'ADMIN',
  'OTHER',
] as const;

export const TimeBlockSchema = z.object({
  title: z.string().min(1).max(200),
  date: flexibleDate,
  startTime: z.string().regex(TIME_RE, 'startTime must be HH:mm'),
  endTime: z.string().regex(TIME_RE, 'endTime must be HH:mm'),
  type: z.enum(TIME_BLOCK_TYPES),
  // Optional links. Ownership is verified server-side against the caller's
  // workspace (soft-IDOR guard); an empty string is coerced to null there.
  taskId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const TimeBlockUpdateSchema = TimeBlockSchema.partial();

export const MilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  date: flexibleDate,
  projectId: z.string().min(1),
});

export const MilestoneUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: flexibleDate.optional(),
  projectId: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export const RoutineOccurrenceSchema = z.object({
  id: z.string(),
  habitId: z.string().min(1),
  // Accept either a day key or the emitted UTC-noon ISO; reject Invalid Date.
  date: flexibleDate,
  completed: z.boolean(),
});

export const WeekQuerySchema = z.object({
  start: dateKeyString,
  end: dateKeyString,
  workspaceId: z.string().optional(),
}).refine(({ start, end }) => end >= start && new Date(end).getTime() - new Date(start).getTime() <= 366 * 86400000, 'range must be ordered and no longer than 366 days');

export const HolidayQuerySchema = z.object({
  country: z.string().min(1),
  region: z.string().optional(),
  start: dateKeyString,
  end: dateKeyString,
}).refine(({ start, end }) => end >= start && new Date(end).getTime() - new Date(start).getTime() <= 366 * 86400000, 'range must be ordered and no longer than 366 days');
