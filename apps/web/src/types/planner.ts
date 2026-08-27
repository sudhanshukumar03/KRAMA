// =============================================================================
// PLANNER TYPES — KRAMA OS
// =============================================================================

export type TimeBlockType =
  | 'MEETING'
  | 'PERSONAL'
  | 'STUDY'
  | 'WORK'
  | 'HEALTH'
  | 'ADMIN'
  | 'OTHER';

export interface Routine {
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
}

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

export interface Holiday {
  id: string;
  name: string;
  date: string;
  countryCode: string;
  regionCode?: string | null;
  type:
    | 'NATIONAL'
    | 'STATE'
    | 'REGIONAL'
    | 'OPTIONAL'
    | 'INTERNATIONAL'
    | 'OBSERVANCE';
  isOptional: boolean;
}

export interface PlannerCapacity {
  weeklyCapacityMinutes: number;
  occupiedMinutes: number;
  meetingMinutes: number;
  otherMinutes: number;
  freeMinutes: number;
  completionPercent: number;
}

export interface PlannerData {
  weekStart: string;
  weekEnd: string;
  routines: Routine[];
  occurrences: RoutineOccurrence[];
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  projects: PlannerProject[];
  milestones: Milestone[];
  holidays: Holiday[];
  capacity: PlannerCapacity;
  syncStatus: {
    provider?: string | null;
    status?: string;
    lastSyncedAt?: string | null;
  } | null;
  config?: {
    countryCode: string;
    regionCode?: string | null;
  };
}

export interface CreateTimeBlockInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: TimeBlockType;
  taskId?: string | null;
  projectId?: string | null;
  notes?: string | null;
}
