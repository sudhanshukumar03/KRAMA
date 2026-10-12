// Shared request and response contracts; importing them does not require a database client.
import type {
  PublicUser as User, Workspace as StoredWorkspace, Project as StoredProject, Task,
  Goal as StoredGoal, GoalProgressSnapshot, Habit as StoredHabit, HabitCompletion,
  Space as StoredSpace, Document as StoredDocument, DocumentType,
  DocumentVersion as StoredDocumentVersion, Tag as StoredTag, DocumentTag,
  Label, Comment as StoredComment, Notification as StoredNotification,
  TaskStatus, TaskPriority, Role, EntityLink as StoredEntityLink,
  FocusSession as StoredFocusSession, ActivityLog as StoredActivityLog,
  JsonValue, Folder, Milestone as StoredMilestone, LabelsOnTasks, TimeBlock as StoredTimeBlock, DailyLog, Sprint, SprintReport,
} from './records';

export type { TaskStatus, TaskPriority, DocumentType };

import type {
  CreateProjectInput, UpdateProjectInput, CreateGoalInput, UpdateGoalInput,
  CreateHabitInput, UpdateHabitInput, UpdateTaskInput, CreateTaskInput,
} from '@krama/validation';

// Workspace scope is supplied by the active-workspace request header.
// Metadata remains an opaque JSON extension; named fields use schema inputs.
type WriteInput<T> = Omit<T, 'workspaceId' | 'metadata'> & { workspaceId?: string; metadata?: unknown };
export type ProjectCreateInput = WriteInput<CreateProjectInput>;
export type ProjectUpdateInput = WriteInput<UpdateProjectInput>;
export type GoalCreateInput = Omit<WriteInput<CreateGoalInput>, 'targetDate'> & { targetDate?: string | null };
export type GoalUpdateInput = Omit<WriteInput<UpdateGoalInput>, 'targetDate'> & { targetDate?: string | null; note?: string };
export type HabitCreateInput = WriteInput<CreateHabitInput>;
export type HabitUpdateInput = WriteInput<UpdateHabitInput>;
export type TaskUpdateInput = Omit<WriteInput<UpdateTaskInput>, "metadata"> & { metadata?: JsonValue };
export interface WorkspaceCreateInput { name: string; metadata?: Record<string, unknown> }
export type WorkspaceUpdateInput = Partial<WorkspaceCreateInput>;
export interface SpaceCreateInput { name: string; icon?: string | null; metadata?: unknown }
export type SpaceUpdateInput = Partial<SpaceCreateInput>;
export interface TelemetryInput { mood?: string; energy?: string; reflection?: string; sessionSeconds?: number; wins?: number }

export type Workspace = StoredWorkspace;
export type Space = StoredSpace;
export type Issue = Task;
export type Project = StoredProject;
export type Goal = StoredGoal;
export type Document = StoredDocument;
export type DocumentVersion = StoredDocumentVersion;
export type Tag = StoredTag;
export type Notification = StoredNotification;
export type EntityLink = StoredEntityLink;
export type FocusSession = StoredFocusSession;
export type ActivityLog = StoredActivityLog;

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

export type Habit = StoredHabit & {
  linkedGoal?: Goal | null;
  completions?: HabitCompletion[];
  pinnedToPlanner?: boolean;
  timeOfDay?: NonNullable<HabitCreateInput["timeOfDay"]>;
  // Weekly cadence target is stored in metadata and exposed by formatHabit.
  weeklyTarget?: number;
};

export type GoalWithRelations = Goal & {
  childGoals?: GoalWithRelations[];
  linkedProjects?: Project[];
  habits?: Pick<Habit, 'id'>[];
  snapshots?: GoalProgressSnapshot[];
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

export type DocumentSummary = Omit<Document, 'contentJson' | 'contentMarkdown'>;

export type DocumentWithRelations = DocumentSummary & Partial<Pick<Document, 'contentJson' | 'contentMarkdown'>> & {
  children?: Document[];
  parent?: Document | null;
  space?: Space | null;
  linkedProjectId?: string | null;
  tags?: (DocumentTag & { tag: Tag })[];
  versions?: DocumentVersion[];
  linkedProject?: (Project & { tasks?: Issue[]; goal?: Goal | null }) | null;
};

export type DocumentDetail = DocumentWithRelations & Pick<Document, 'contentJson' | 'contentMarkdown'>;
export type DocumentVersionSummary = Pick<DocumentVersion, 'id' | 'versionNumber' | 'createdAt' | 'editedById'>;
export type DocumentMetadataInput = Partial<Pick<Document,
  'title' | 'subtitle' | 'statusBadges' | 'documentType' | 'isFavorite' | 'icon' | 'projectId'
>> & { linkedProjectId?: string | null; expectedUpdatedAt?: string };
export type DocumentCreateInput = Pick<Document, 'title'> & Partial<Pick<Document,
  'spaceId' | 'folderId' | 'parentId' | 'projectId' | 'documentType'
>> & { workspaceId?: string; contentJson?: unknown };
export type DocumentSearchResult = Pick<Document,
  'id' | 'title' | 'subtitle' | 'icon' | 'documentType' | 'statusBadges' | 'projectId' | 'updatedAt'
> & { snippet: string };
export interface DocumentContentResult { updatedAt: string; wordCount: number; charCount: number }
export interface DocumentGraph {
  nodes: { id: string; title: string; type: 'DOCUMENT' | 'PROJECT' | 'TASK'; documentType?: DocumentType }[];
  links: EntityLink[];
}

export interface WallpaperResponse {
  error?: 'UNSPLASH_NOT_CONFIGURED';
  status?: number;
  wallpapers: { id: string; url: string; thumb: string; credit: string; creditUrl: string }[];
}

export interface DashboardData {
  greeting: string;
  onboarding: { completed: number; total: number; steps: { id: string; title: string; completed: boolean }[] };
  workspace: Workspace | null;
  stats: { totalProjects: number; totalTasks: number; totalHabits: number; totalNotes: number; totalGoals: number };
  today: { tasks: Issue[]; overdueTaskIds: string[]; focusMinutes: number; focusSessions: FocusSession[] };
  habits: Habit[];
  goals: Pick<Goal, 'id' | 'title' | 'progress' | 'targetDate' | 'metadata'>[];
  dateKey: string;
  projects: (Project & { progress: number })[];
  focus: { sessions: FocusSession[] };
  activity: ActivityLog[];
  features: { aiInsights: boolean; dashboardLayout: boolean; achievements: boolean; knowledgeGraph: boolean; quickCapture: boolean; pomodoro: boolean };
}

export interface AiConfiguration {
  available: boolean;
  provider: 'groq' | 'gemini' | null;
  model: string | null;
  fallbackAvailable: boolean;
  ragEnabled: boolean;
  memoryEnabled: boolean;
}
export interface AiResponse {
  type: 'direct' | 'explanation' | 'recommendation' | 'plan' | 'summary' | 'comparison' | 'rag' | 'action';
  title?: string;
  answer: string;
  sections: { title: string; content: string }[];
  actions: { label: string; type: 'open_page' | 'create_task' | 'complete_task' | 'open_project' | 'none'; id?: string }[];
  sources: { pageId: string; title: string; chunkId?: string; relevance?: number }[];
  confidence?: 'high' | 'medium' | 'low';
  intent: 'general' | 'knowledge' | 'productivity' | 'planning' | 'task' | 'summary';
}

export interface WorkspaceExport {
  format: 'krama-workspace-backup';
  formatVersion: 2;
  exportedAt: string;
  includesTrash: true;
  workspace: Workspace & {
    members: { role: Role; user: User }[];
    goals: (Goal & { snapshots: GoalProgressSnapshot[] })[];
    projects: (Project & { milestones: StoredMilestone[] })[];
    spaces: (Space & { folders: Folder[]; documents: (Document & { versions: DocumentVersion[]; tags: DocumentTag[] })[] })[];
    tasks: (Issue & { comments: StoredComment[]; labels: LabelsOnTasks[] })[];
    habits: (Habit & { completions: HabitCompletion[] })[];
    timeBlocks: StoredTimeBlock[];
    focusSessions: FocusSession[];
    dailyLogs: DailyLog[];
    sprints: Sprint[];
    sprintReports: SprintReport[];
    tags: Tag[];
    labels: Label[];
    activityLogs: ActivityLog[];
    notifications: Notification[];
  };
  entityLinks: EntityLink[];
  excluded: string[];
}

export type TaskComment = StoredComment & { author?: Pick<User, 'name'> };

export type TaskCreateInput = WriteInput<CreateTaskInput>;

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

export interface GoalMetadata {
  whyStatement?: string; description?: string; category?: string; progressMode?: 'manual' | 'auto';
  measurable?: boolean; targetValue?: number; currentValue?: number; isPinned?: boolean;
  status?: string; unit?: string; weight?: number; [key: string]: unknown;
}

export type ProjectStatus = NonNullable<ProjectCreateInput["status"]>;
