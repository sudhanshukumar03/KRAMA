import type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Task as Issue,
  Sprint,
  Goal,
  GoalProgressSnapshot,
  Habit as PrismaHabit,
  HabitCompletion,
  Space,
  Page,
  Decision,
  DailyLog,
  SprintReport,
  WorkspaceAnalytics,
  Notification,
  ActivityLog,
  Comment,
  Label,
  AiRequest,
  TaskStatus,
  TaskPriority
} from "@prisma/client";

export type { TaskStatus, TaskPriority };

export type Habit = PrismaHabit & {
  linkedGoal?: Goal | null;
  completions?: HabitCompletion[];
  pinnedToPlanner?: boolean;
};

export type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Issue,
  Sprint,
  Goal,
  GoalProgressSnapshot,
  HabitCompletion,
  Space,
  Page,
  Decision,
  DailyLog,
  SprintReport,
  WorkspaceAnalytics,
  Notification,
  ActivityLog,
  Comment,
  Label,
  AiRequest
};



export type RoadmapItem = any;
export type Resource = any;
export type LearningTopic = any;
export type ApplicationEntry = any;
export type AutomationRule = any;

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
  tasks?: Issue[];
  pages?: Page[];
  sprints?: Sprint[];
  roadmapItems?: RoadmapItem[];
  goal?: GoalWithRelations | null;
  space?: Space | null;
  _count?: {
    tasks?: number;
    sprints?: number;
    roadmapItems?: number;
    pages?: number;
  };
};

export type PageWithRelations = Page & {
  childPages?: Page[];
  linkedProject?: (Project & {
    tasks?: Issue[];
    goal?: Goal | null;
    sprints?: Sprint[];
  }) | null;
  space?: Space | null;
};

export type IssueWithRelations = Issue & {
  assignee?: User | null;
  project?: Project | null;
  sprint?: Sprint | null;
  childTasks?: Issue[];
  parentTask?: Issue | null;
  blockedBy?: Issue | null;
  blocking?: Issue[];
  labels?: Label[];
  comments?: any[];
};

export type SpaceWithRelations = Space & {
  pages?: Page[];
  projects?: Project[];
};

export type DecisionWithRelations = Decision & {
  linkedProject?: {
    id: string;
    name: string;
  } | null;
};

export interface SearchResult {
  id: string;
  title: string;
  type: 'page' | 'issue' | 'project' | 'goal' | 'decision';
  snippet: string;
  url: string;
  badge?: string;
}
