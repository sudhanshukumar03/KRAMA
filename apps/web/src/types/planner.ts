// =============================================================================
// PLANNER TYPES — KRAMA OS
// =============================================================================

import type { Holiday, TimeBlockType as StoredTimeBlockType } from '@prisma/client';

export type TimeBlockType = StoredTimeBlockType;

interface Routine {
  id: string;
  name: string;
}

export interface RoutineOccurrence {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface PlannerTask {
  id: string;
  title: string;
  completed: boolean;
  status?: string;
  scheduledDate?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  priority?: string;
  project?: PlannerProject | null;
}

export interface TimeBlock {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: TimeBlockType;
  taskId?: string | null;
  projectId?: string | null;
  notes?: string | null;
  isExternal?: boolean;
  isPublicHoliday?: boolean;
  isOptional?: boolean;
  source?: string;
}

// Request dates are JSON strings; validated service dates are Date objects.
export type TimeBlockInput = Pick<TimeBlock, 'title' | 'date' | 'startTime' | 'endTime' | 'type' | 'taskId' | 'projectId' | 'notes'>;
export type TimeBlockUpdate = Partial<TimeBlockInput>;
export type MilestoneInput = Pick<Milestone, 'title' | 'date' | 'projectId'>;
export type MilestoneUpdate = Partial<Pick<Milestone, 'title' | 'date' | 'projectId' | 'completed'>>;

export interface PlannerProject {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  projectId: string;
}

// A goal whose targetDate falls inside the queried range — surfaced in the
// planner as a read-only deadline chip (goals are edited from the Goals page,
// not the planner).
export interface GoalDeadline {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
  icon?: string | null;
}

interface PlannerCapacity {
  weeklyCapacityMinutes: number;
  occupiedMinutes: number;
  meetingMinutes: number;
  otherMinutes: number;
  freeMinutes: number;
  completionPercent: number;
  taskCompletionPercent?: number;
  completedTaskCount?: number;
  scheduledTaskCount?: number;
}

export interface MilestoneRange {
  milestones: Milestone[];
  goalDeadlines: GoalDeadline[];
}

interface HolidayCoverage {
  missingNationalYears: number[];
  missingRegionalYears: number[];
}

export interface HolidayCalendar {
  location: { countryCode: string; regionCode: string | null };
  holidays: (Omit<Holiday, 'date' | 'createdAt' | 'updatedAt'> & { date: string; createdAt: string; updatedAt: string })[];
  coverage: HolidayCoverage;
}

// One day column as emitted by GET /week. The server pre-buckets tasks, blocks,
// routine occurrences and milestones per day, keyed by the canonical day string.
export interface PlannerDay {
  dateKey: string;
  date: string;
  occurrences: RoutineOccurrence[];
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  milestones: Milestone[];
  goalDeadlines?: GoalDeadline[];
}

export interface PlannerData {
  weekStart: string;
  weekEnd: string;
  routines: Routine[];
  occurrences: RoutineOccurrence[];
  days: PlannerDay[];
  tasks: PlannerTask[];
  backlog?: PlannerTask[];
  timeBlocks: TimeBlock[];
  projects: PlannerProject[];
  milestones: Milestone[];
  goalDeadlines?: GoalDeadline[];
  capacity: PlannerCapacity;
  workDayMinutes?: number;
  config?: {
    countryCode: string;
    regionCode?: string | null;
  };
  holidayCoverage?: HolidayCoverage;
}
