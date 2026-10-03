import type {
  User,
  Workspace,
  Project,
  Task as Issue,
  Goal,
  GoalProgressSnapshot,
  Habit as PrismaHabit,
  HabitCompletion,
  Space,
  Document,
  DocumentType,
  DocumentVersion,
  Tag,
  DocumentTag,
  Label,
  TaskStatus,
  TaskPriority
} from "@prisma/client";

export type { TaskStatus, TaskPriority,    DocumentVersion, DocumentType };

export type Habit = PrismaHabit & {
  linkedGoal?: Goal | null;
  completions?: HabitCompletion[];
  pinnedToPlanner?: boolean;
  // Weekly cadence target (N completions/week). Stored in `metadata` JSON on the
  // server and re-exposed by formatHabit — not a Prisma column.
  weeklyTarget?: number;
  // Longest streak ever achieved (Prisma column; declared here so the web type
  // is stable regardless of prisma-generate timing).
  bestStreak?: number;
};

export type {
  
  Workspace,
  
  
  Issue,



  Space,
  
  
  
  
  
  
  
  
};



type RoadmapItem = any;
// Extended types for relations
export type GoalWithRelations = Goal & {
  childGoals?: GoalWithRelations[];
  linkedProjects?: Project[];
  habits?: Pick<Habit, 'id'>[];
  snapshots?: GoalProgressSnapshot[];
  _count?: {
    projects?: number;
    habits?: number;
  };
};

export type ProjectWithRelations = Project & {
  targetDate?: string | Date | null;
  tasks?: Issue[];
  documents?: Document[];
  roadmapItems?: RoadmapItem[];
  goal?: GoalWithRelations | null;
  space?: Space | null;
  _count?: {
    tasks?: number;
    roadmapItems?: number;
    documents?: number;
  };
};

export type DocumentWithRelations = Document & {
  children?: Document[];
  parent?: Document | null;
  space?: Space | null;
  linkedProjectId?: string | null;
  tags?: (DocumentTag & { tag: Tag })[];
  versions?: DocumentVersion[];
  linkedProject?: (Project & {
    tasks?: Issue[];
    goal?: Goal | null;
  }) | null;
};

export type IssueWithRelations = Issue & {
  assignee?: User | null;
  project?: Project | null;
  childTasks?: Issue[];
  parentTask?: Issue | null;
  blockedBy?: Issue | null;
  blocking?: Issue[];
  labels?: Label[];
  comments?: any[];
};

export interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'page' | 'issue' | 'project' | 'goal' | 'decision';
  snippet: string;
  url: string;
  badge?: string;
}
