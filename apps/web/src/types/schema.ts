import type {
  User, Workspace as StoredWorkspace, Project as StoredProject, Task,
  Goal as StoredGoal, GoalProgressSnapshot, Habit as StoredHabit, HabitCompletion,
  Space as StoredSpace, Document as StoredDocument, DocumentType,
  DocumentVersion as StoredDocumentVersion, Tag as StoredTag, DocumentTag,
  Label, Comment as StoredComment, Notification as StoredNotification,
  TaskStatus, TaskPriority, Role,
} from '@prisma/client';

export type { TaskStatus, TaskPriority, DocumentType };

// HTTP JSON serializes database dates as strings, including nullable columns.
type JsonDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type Workspace = JsonDates<StoredWorkspace>;
export type Space = JsonDates<StoredSpace>;
export type Issue = JsonDates<Task>;
export type Project = JsonDates<StoredProject>;
export type Goal = JsonDates<StoredGoal>;
export type Document = JsonDates<StoredDocument>;
export type DocumentVersion = JsonDates<StoredDocumentVersion>;
export type Tag = JsonDates<StoredTag>;
export type Notification = JsonDates<StoredNotification>;

export interface TimerPreferences {
  sprint?: number;
  deep?: number;
  quick?: number;
  focusDuration?: number;
  shortBreak?: number;
  longBreak?: number;
  longBreakAfter?: number;
  customDuration?: number;
  autoStartBreaks?: boolean;
  autoStartPomodoros?: boolean;
  soundEnabled?: boolean;
  digitsColor?: string;
}

export interface UserMetadata {
  timerPreferences?: TimerPreferences;
  focusWallpaper?: { type: string; value: string; thumb?: string; credit?: string; creditUrl?: string };
  focusLayout?: string;
  [key: string]: unknown;
}

export interface AuthUser extends Pick<User, 'id' | 'email' | 'name'> {
  memberships: {
    workspaceId: string;
    role: Role;
    workspace?: Pick<Workspace, 'id' | 'name' | 'productivityScore'>;
  }[];
  metadata: UserMetadata | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface PreferencesInput {
  timerPreferences?: Pick<TimerPreferences, 'focusDuration' | 'shortBreak' | 'longBreak' | 'longBreakAfter'>;
  focusWallpaper?: UserMetadata['focusWallpaper'];
  focusLayout?: string;
  weeklyCapacityMinutes?: number;
  locationConfig?: { countryCode: string; regionCode?: string | null };
}

export interface FocusCompletionInput {
  completionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  taskId?: string;
  projectId?: string;
}

export type Habit = JsonDates<StoredHabit> & {
  linkedGoal?: Goal | null;
  completions?: JsonDates<HabitCompletion>[];
  pinnedToPlanner?: boolean;
  // Weekly cadence target is stored in metadata and exposed by formatHabit.
  weeklyTarget?: number;
};

export type GoalWithRelations = Goal & {
  childGoals?: GoalWithRelations[];
  linkedProjects?: Project[];
  habits?: Pick<Habit, 'id'>[];
  snapshots?: JsonDates<GoalProgressSnapshot>[];
  _count?: { projects?: number; habits?: number };
};

export type ProjectWithRelations = Project & {
  targetDate?: string | null;
  tasks?: Issue[];
  documents?: Document[];
  milestones?: { id: string; title: string; date: string; completed: boolean }[];
  goal?: GoalWithRelations | null;
  space?: Space | null;
  _count?: { tasks?: number; documents?: number };
};

export type DocumentWithRelations = Document & {
  children?: Document[];
  parent?: Document | null;
  space?: Space | null;
  linkedProjectId?: string | null;
  tags?: (DocumentTag & { tag: Tag })[];
  versions?: DocumentVersion[];
  linkedProject?: (Project & { tasks?: Issue[]; goal?: Goal | null }) | null;
};

export type TaskComment = JsonDates<StoredComment> & { author?: Pick<User, 'name'> };

export type TaskCreateInput = Pick<Issue, 'title'> & Partial<Pick<Issue,
  'workspaceId' | 'description' | 'projectId' | 'assigneeId' | 'status' | 'priority' |
  'blockedById' | 'parentTaskId' | 'estimateMinutes' | 'scheduledDate' | 'dueDate' | 'metadata'
>>;

export type IssueWithRelations = Issue & {
  assignee?: Pick<User, 'id' | 'name' | 'email'> | null;
  project?: ProjectWithRelations | null;
  childTasks?: Issue[];
  parentTask?: Pick<Issue, 'id' | 'workspaceId' | 'deletedAt'> | null;
  blockedBy?: Issue | null;
  blocking?: Pick<Issue, 'id' | 'title' | 'workspaceId' | 'deletedAt'>[];
  labels?: Label[];
  comments?: TaskComment[];
};

export interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'page' | 'issue' | 'project' | 'goal' | 'decision';
  snippet: string;
  url: string;
  badge?: string;
}
