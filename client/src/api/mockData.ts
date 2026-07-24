import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem
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
    goalId: 'goal-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'proj-2',
    name: 'Learn AI',
    problemStatement: 'Need to get better at agentic systems.',
    status: 'idea',
    spaceId: 'space-2',
    goalId: 'goal-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

// Calculate dates relative to today for accurate pacing math
const today = new Date();
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

const pastDate = new Date(today);
pastDate.setDate(today.getDate() - 14);

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
    childIssues: [],
    labels: ['task'],
    dueDate: null,
    scheduledDate: null,
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
    childIssues: [
      {
        id: 'sub-1',
        title: 'Install dnd-kit',
        description: null,
        status: 'done',
        priority: 'medium',
        estimate: null,
        assignee: null,
        projectId: 'proj-1',
        sprintId: null,
        parentIssueId: 'issue-2',
        labels: [],
        dueDate: null,
        scheduledDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sub-2',
        title: 'Setup dropping',
        description: null,
        status: 'todo',
        priority: 'medium',
        estimate: null,
        assignee: null,
        projectId: 'proj-1',
        sprintId: null,
        parentIssueId: 'issue-2',
        labels: [],
        dueDate: null,
        scheduledDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sub-3',
        title: 'Animation physics',
        description: null,
        status: 'todo',
        priority: 'medium',
        estimate: null,
        assignee: null,
        projectId: 'proj-1',
        sprintId: null,
        parentIssueId: 'issue-2',
        labels: [],
        dueDate: null,
        scheduledDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    labels: ['feature'],
    dueDate: nextWeek,
    scheduledDate: null,
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
    childIssues: [],
    labels: ['feature'],
    dueDate: null,
    scheduledDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockPages: PageWithRelations[] = [
  {
    id: 'page-1',
    title: 'Architecture Overview',
    icon: 'landmark',
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
    icon: 'laptop',
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
    id: "goal-root",
    title: "2026 Yearly OKRs",
    type: "yearly",
    targetDate: new Date("2026-12-31"),
    parentGoalId: null,
    progress: 25, // Will be computed in UI as rollup
    childGoals: [
      { id: "goal-1", title: "Launch KRAMA OS MVP", type: "quarterly", targetDate: new Date("2026-10-01"), progress: 35 } as GoalWithRelations,
      { id: "goal-2", title: "Master AI Agents", type: "quarterly", targetDate: pastDate, progress: 10 } as GoalWithRelations
    ],
    snapshots: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "goal-1",
    title: "Launch KRAMA OS MVP",
    type: "quarterly",
    targetDate: new Date("2026-10-01"),
    parentGoalId: "goal-root",
    progress: 35,
    snapshots: [
      { id: "snap-1", goalId: "goal-1", date: new Date(today.getTime() - 4 * 86400000), progress: 30, createdAt: new Date() },
      { id: "snap-2", goalId: "goal-1", date: new Date(today.getTime() - 2 * 86400000), progress: 32, createdAt: new Date() },
      { id: "snap-3", goalId: "goal-1", date: today, progress: 35, createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "goal-2",
    title: "Master AI Agents",
    type: "quarterly",
    targetDate: pastDate, // Past date to test "Stalled/Past Due" logic
    parentGoalId: "goal-root",
    progress: 10,
    snapshots: [
      // Zero recent progress
      { id: "snap-4", goalId: "goal-2", date: new Date(today.getTime() - 7 * 86400000), progress: 10, createdAt: new Date() },
      { id: "snap-5", goalId: "goal-2", date: new Date(today.getTime() - 3 * 86400000), progress: 10, createdAt: new Date() },
      { id: "snap-6", goalId: "goal-2", date: today, progress: 10, createdAt: new Date() }
    ],
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
    lastCompletedAt: new Date(today.getTime() - 86400000), // yesterday
    linkedGoalId: "goal-1",
    category: "Learning",
    timeOfDay: "morning",
    difficulty: "Medium",
    duration: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "habit-2",
    name: "Read 10 pages",
    cadence: "daily",
    streak: 12,
    lastCompletedAt: today,
    linkedGoalId: null,
    category: "Personal",
    timeOfDay: "evening",
    difficulty: "Easy",
    duration: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "habit-3",
    name: "Gym Workout",
    cadence: "daily",
    streak: 2,
    lastCompletedAt: new Date(today.getTime() - 86400000),
    linkedGoalId: "goal-root",
    category: "Fitness",
    timeOfDay: "morning",
    difficulty: "Hard",
    duration: 45,
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
    date: today,
    wins: ["Finished Phase 2 UI", "Setup Tailwind v4", "Got Dnd-kit working"],
    blockers: ["Waiting for backend endpoints"],
    mood: "Great",
    energy: "High",
    deepWorkMinutes: 180,
    notes: "Today was highly productive. The AI coding assistant nailed the boilerplate.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "log-2",
    date: new Date(today.getTime() - 86400000), // yesterday
    wins: ["Planned the architecture"],
    blockers: [],
    mood: "Good",
    energy: "Medium",
    deepWorkMinutes: 120,
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockRoadmapItems: RoadmapItem[] = [
  {
    id: "rm-1",
    title: "Phase 1: Foundation",
    version: "v0.1",
    order: 0,
    status: "completed",
    projectId: "proj-1",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "rm-2",
    title: "Phase 2: Master UI",
    version: "v0.2",
    order: 1,
    status: "in_progress",
    projectId: "proj-1",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "rm-3",
    title: "Phase 3: Backend Integration",
    version: "v1.0",
    order: 2,
    status: "planned",
    projectId: "proj-1",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];