// JSON records shared by API consumers. Dates cross the HTTP boundary as strings.
// Keep these contracts independent of Prisma and database-only fields.
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue | undefined }

export interface PublicUser { id: string; email: string; name: string | null }

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'GUEST';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELED';
export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type HabitDifficulty = 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
export type HabitCategory = 'HEALTH' | 'LEARNING' | 'PRODUCTIVITY' | 'MINDFULNESS' | 'FINANCE' | 'OTHER';
export type TimeBlockType = 'MEETING' | 'PERSONAL' | 'STUDY' | 'WORK' | 'HEALTH' | 'ADMIN' | 'OTHER';
export type HolidayType = 'NATIONAL' | 'STATE' | 'REGIONAL' | 'FESTIVAL' | 'RELIGIOUS' | 'OPTIONAL' | 'OBSERVANCE' | 'INTERNATIONAL' | 'BANK' | 'SCHOOL' | 'OTHER';
export type SyncStatus = 'LOCAL_ONLY' | 'SYNC_PENDING' | 'SYNCED' | 'SYNC_ERROR' | 'CONFLICT';
export type DocumentType = 'SPEC' | 'NOTE' | 'MEETING' | 'IDEA' | 'RFC' | 'GENERAL';
export type EntityType = 'DOCUMENT' | 'PROJECT' | 'TASK' | 'MEETING';
export type LinkType = 'REFERENCE' | 'RELATED';

export interface Workspace {
  id: string;
  name: string;
  metadata: JsonValue | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  productivityScore: number;
}

export interface Space {
  id: string;
  name: string;
  icon: string | null;
  metadata: JsonValue | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimateMinutes: number | null;
  scheduledDate: string | null;
  dueDate: string | null;
  metadata: JsonValue | null;
  workspaceId: string;
  projectId: string | null;
  sprintId: string | null;
  assigneeId: string | null;
  blockedById: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  position: number;
}

export interface Project {
  id: string;
  name: string;
  problemStatement: string | null;
  status: string;
  metadata: JsonValue | null;
  workspaceId: string;
  icon: string | null;
  goalId: string | null;
  spaceId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  position: number;
}

export interface Goal {
  id: string;
  title: string;
  type: string;
  progress: number;
  targetDate: string | null;
  icon: string | null;
  metadata: JsonValue | null;
  workspaceId: string;
  spaceId: string | null;
  parentGoalId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface Document {
  id: string;
  spaceId: string;
  folderId: string | null;
  parentId: string | null;
  projectId: string | null;
  title: string;
  subtitle: string | null;
  icon: string | null;
  contentJson: JsonValue;
  contentMarkdown: string;
  statusBadges: string[];
  documentType: DocumentType;
  isFavorite: boolean;
  wordCount: number;
  charCount: number;
  deletedAt: string | null;
  createdById: string;
  lastEditedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  contentJson: JsonValue;
  editedById: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  metadata: JsonValue | null;
  createdAt: string;
}

export interface EntityLink {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  linkType: LinkType;
  createdById: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  completed: boolean;
  type: string;
  projectId: string | null;
  taskId: string | null;
  userId: string;
  workspaceId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: JsonValue | null;
  userId: string;
  workspaceId: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string | null;
  streak: number;
  bestStreak: number;
  expectedDurationMinutes: number | null;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  cadence: string;
  scheduledDays: number[];
  metadata: JsonValue | null;
  workspaceId: string;
  linkedGoalId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completedAt: string;
  offSchedule: boolean;
  notes: string | null;
  metadata: JsonValue | null;
}

export interface GoalProgressSnapshot {
  id: string;
  goalId: string;
  progress: number;
  notes: string | null;
  date: string;
  createdAt: string;
}

export interface DocumentTag {
  documentId: string;
  tagId: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string | null;
  workspaceId: string;
}

export interface Holiday {
  id: string;
  name: string;
  localName: string | null;
  description: string | null;
  date: string;
  countryCode: string;
  regionCode: string | null;
  type: HolidayType;
  isOptional: boolean;
  isPublicHoliday: boolean;
  source: string | null;
  sourceId: string | null;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  spaceId: string;
  parentFolderId: string | null;
  name: string;
  color: string | null;
  order: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabelsOnTasks {
  taskId: string;
  labelId: string;
}

export interface TimeBlock {
  id: string;
  userId: string;
  workspaceId: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: TimeBlockType;
  taskId: string | null;
  projectId: string | null;
  notes: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLog {
  id: string;
  date: string;
  wins: string[];
  blockers: string[];
  mood: string | null;
  energy: string | null;
  deepWorkMinutes: number | null;
  notes: string | null;
  metadata: JsonValue | null;
  workspaceId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  metadata: JsonValue | null;
  workspaceId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface SprintReport {
  id: string;
  sprintId: string;
  workspaceId: string;
  generatedAt: string;
  tasksCompleted: number;
  tasksPlanned: number;
  metadata: JsonValue | null;
}
