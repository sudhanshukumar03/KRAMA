import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog
} from '../types/schema';

export const mockWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'Personal OS',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSpaces: Space[] = [
  { id: 'space-1', name: 'Knowledge Base', workspaceId: 'workspace-1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'space-2', name: 'Projects', workspaceId: 'workspace-1', createdAt: new Date(), updatedAt: new Date() },
];

export const mockProjects: ProjectWithRelations[] = [
  {
    id: 'proj-1',
    name: 'KRAMA OS',
    problemStatement: 'Need a unified system for productivity.',
    status: 'active',
    spaceId: 'space-2',
    goalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'proj-2',
    name: 'Learn AI',
    problemStatement: 'Need to get better at agentic systems.',
    status: 'idea',
    spaceId: 'space-2',
    goalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockIssues: IssueWithRelations[] = [
  {
    id: 'issue-1',
    title: 'Setup Mock Data',
    description: 'Create the fake database for the frontend.',
    status: 'done',
    priority: 'high',
    estimate: 2,
    assignee: 'me',
    projectId: 'proj-1',
    sprintId: null,
    parentIssueId: null,
    labels: ['task'],
    dueDate: null,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'issue-2',
    title: 'Build Kanban Board',
    description: 'Use dnd-kit for a linear-style board.',
    status: 'in_progress',
    priority: 'urgent',
    estimate: 5,
    assignee: 'me',
    projectId: 'proj-1',
    sprintId: null,
    parentIssueId: null,
    labels: ['feature'],
    dueDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'issue-3',
    title: 'Page Tree component',
    description: 'Recursive rendering of pages.',
    status: 'todo',
    priority: 'medium',
    estimate: 3,
    assignee: 'me',
    projectId: 'proj-1',
    sprintId: null,
    parentIssueId: null,
    labels: ['feature'],
    dueDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockPages: PageWithRelations[] = [
  {
    id: 'page-1',
    title: 'Architecture Overview',
    icon: '🏛️',
    blocks: null,
    parentPageId: null,
    spaceId: 'space-1',
    linkedProjectId: 'proj-1',
    tags: ['design'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'page-2',
    title: 'Tech Stack',
    icon: '💻',
    blocks: null,
    parentPageId: 'page-1',
    spaceId: 'space-1',
    linkedProjectId: 'proj-1',
    tags: ['engineering'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockGoals: GoalWithRelations[] = [
  {
    id: "goal-1",
    title: "Launch KRAMA OS MVP",
    type: "quarterly",
    targetDate: new Date("2026-10-01"),
    parentGoalId: null,
    progress: 35,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockHabits: Habit[] = [
  {
    id: "habit-1",
    name: "Code for 1 hour",
    cadence: "daily",
    streak: 5,
    lastCompletedAt: new Date(),
    linkedGoalId: "goal-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockSprints: Sprint[] = [
  {
    id: "sprint-1",
    name: "Sprint 1: The Setup",
    startDate: new Date("2026-07-20"),
    endDate: new Date("2026-08-03"),
    projectId: "proj-1",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockDailyLogs: DailyLog[] = [
  {
    id: "log-1",
    date: new Date(),
    wins: ["Finished Phase 2 UI", "Setup Tailwind v4", "Got Dnd-kit working"],
    blockers: ["Waiting for backend endpoints"],
    mood: "Great",
    energy: "High",
    deepWorkMinutes: 180,
    notes: "Today was highly productive. The AI coding assistant nailed the boilerplate.",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];