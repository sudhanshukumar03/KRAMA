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

interface PlannerTask {
  id: string;
  title: string;
  completed: boolean;
  status?: string;
  scheduledDate?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
}

interface TimeBlock {
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
}
