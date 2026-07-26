import type {
  Workspace,
  Space,
  Page,
  Goal,
  Project,
  Issue,
  Sprint,
  RoadmapItem,
  Habit as PrismaHabit,
  HabitCompletion,
  DailyLog,
  Decision,
  Resource,
  LearningTopic,
  ApplicationEntry,
  AutomationRule,
  GoalProgressSnapshot
} from "@prisma/client";

export type Habit = PrismaHabit & {
  linkedGoal?: Goal | null;
  completions?: HabitCompletion[];
};

export type {
  Workspace,
  Space,
  Page,
  Goal,
  Project,
  Issue,
  Sprint,
  RoadmapItem,
  HabitCompletion,
  DailyLog,
  Decision,
  Resource,
  LearningTopic,
  ApplicationEntry,
  AutomationRule,
  GoalProgressSnapshot
};

// Extended types for relations
export type GoalWithRelations = Goal & {
  childGoals?: Goal[];
  linkedProjects?: Project[];
  habits?: Habit[];
  snapshots?: GoalProgressSnapshot[];
};

export type ProjectWithRelations = Project & {
  docs?: Page[];
  issues?: Issue[];
  sprints?: Sprint[];
  roadmapItems?: RoadmapItem[];
  goal?: GoalWithRelations | null;
  space?: Space | null;
  _count?: {
    issues?: number;
    sprints?: number;
    roadmapItems?: number;
    docs?: number;
  };
};

export type PageWithRelations = Page & {
  childPages?: Page[];
  linkedProject?: (Project & {
    issues?: Issue[];
    goal?: Goal | null;
    sprints?: Sprint[];
  }) | null;
};

export type IssueWithRelations = Issue & {
  project?: Project;
  sprint?: Sprint | null;
  childIssues?: Issue[];
  parentIssue?: Issue | null;
  blockedBy?: Issue[];
  blocking?: Issue[];
};

export type SpaceWithRelations = Space & {
  pages?: Page[];
  projects?: Project[];
};
