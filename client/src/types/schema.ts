import type {
  Workspace,
  Space,
  Page,
  Goal,
  Project,
  Issue,
  Sprint,
  RoadmapItem,
  Habit,
  DailyLog,
  Decision,
  Resource,
  LearningTopic,
  ApplicationEntry,
  AutomationRule,
  GoalProgressSnapshot
} from "@prisma/client";

export type {
  Workspace,
  Space,
  Page,
  Goal,
  Project,
  Issue,
  Sprint,
  RoadmapItem,
  Habit,
  DailyLog,
  Decision,
  Resource,
  LearningTopic,
  ApplicationEntry,
  AutomationRule,
  GoalProgressSnapshot
};

// Extended types for relations (how they will look when populated from backend or in our mock data)
export type PageWithRelations = Page & {
  childPages?: Page[];
  linkedProject?: Project | null;
};

export type ProjectWithRelations = Project & {
  docs?: Page[];
  issues?: Issue[];
  goal?: Goal | null;
  space?: Space | null;
};

export type IssueWithRelations = Issue & {
  project?: Project;
  sprint?: Sprint | null;
  childIssues?: Issue[];
  parentIssue?: Issue | null;
};

export type GoalWithRelations = Goal & {
  childGoals?: Goal[];
  linkedProjects?: Project[];
  habits?: Habit[];
  snapshots?: GoalProgressSnapshot[];
};

export type SpaceWithRelations = Space & {
  pages?: Page[];
  projects?: Project[];
};
