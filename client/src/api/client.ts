import { 
  mockWorkspace, 
  mockSpaces, 
  mockProjects, 
  mockIssues, 
  mockPages,
  mockGoals,
  mockHabits,
  mockSprints,
  mockDailyLogs,
  mockRoadmapItems
} from './mockData';
import type { 
  Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem
} from '../types/schema';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory store initialized with mock data
let db = {
  workspace: mockWorkspace,
  spaces: [...mockSpaces],
  projects: [...mockProjects],
  issues: [...mockIssues],
  pages: [...mockPages],
  goals: [...mockGoals],
  habits: [...mockHabits],
  sprints: [...mockSprints],
  dailyLogs: [...mockDailyLogs],
  roadmapItems: [...mockRoadmapItems],
};

export const api = {
  issues: {
    list: async (): Promise<IssueWithRelations[]> => {
      await delay(200);
      return [...db.issues];
    },
    update: async (id: string, data: Partial<IssueWithRelations>): Promise<IssueWithRelations> => {
      await delay(300);
      const index = db.issues.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Issue not found');
      db.issues[index] = { ...db.issues[index], ...data, updatedAt: new Date() };
      return { ...db.issues[index] };
    },
    create: async (data: Partial<IssueWithRelations> & { title: string }): Promise<IssueWithRelations> => {
      await delay(300);
      const newIssue: IssueWithRelations = {
        id: `issue-${Date.now()}`,
        title: data.title,
        description: data.description || null,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        estimate: data.estimate || null,
        assignee: data.assignee || null,
        projectId: data.projectId || 'proj-1',
        sprintId: data.sprintId || null,
        parentIssueId: data.parentIssueId || null,
        childIssues: data.childIssues || [],
        labels: data.labels || [],
        dueDate: data.dueDate || null,
        scheduledDate: data.scheduledDate || null,
        completedAt: data.completedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IssueWithRelations;
      db.issues.push(newIssue);
      return { ...newIssue };
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      const index = db.issues.findIndex(i => i.id === id);
      if (index !== -1) {
        db.issues.splice(index, 1);
      }
    }
  },
  projects: {
    list: async (): Promise<ProjectWithRelations[]> => {
      await delay(200);
      return [...db.projects];
    }
  },
  pages: {
    list: async (): Promise<PageWithRelations[]> => {
      await delay(200);
      return [...db.pages];
    },
    update: async (id: string, data: Partial<PageWithRelations>): Promise<PageWithRelations> => {
      await delay(300);
      const index = db.pages.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Page not found');
      db.pages[index] = { ...db.pages[index], ...data, updatedAt: new Date() };
      return { ...db.pages[index] };
    },
    create: async (data: Partial<PageWithRelations>): Promise<PageWithRelations> => {
      await delay(300);
      const newPage: PageWithRelations = {
        id: `page-${Date.now()}`,
        title: data.title || 'Untitled Doc',
        icon: data.icon || null,
        blocks: data.blocks || null,
        parentPageId: data.parentPageId || null,
        spaceId: data.spaceId || 'space-1',
        linkedProjectId: data.linkedProjectId || null,
        tags: data.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PageWithRelations;
      db.pages.push(newPage);
      return { ...newPage };
    }
  },
  spaces: {
    list: async (): Promise<Space[]> => {
      await delay(200);
      return [...db.spaces];
    }
  },
  goals: {
    list: async (): Promise<GoalWithRelations[]> => {
      await delay(200);
      return [...db.goals];
    },
    update: async (id: string, data: Partial<GoalWithRelations>): Promise<GoalWithRelations> => {
      await delay(300);
      const index = db.goals.findIndex(g => g.id === id);
      if (index === -1) throw new Error('Goal not found');
      db.goals[index] = { ...db.goals[index], ...data, updatedAt: new Date() };
      return { ...db.goals[index] };
    }
  },
  habits: {
    list: async (): Promise<Habit[]> => {
      await delay(200);
      return [...db.habits];
    }
  },
  sprints: {
    list: async (): Promise<Sprint[]> => {
      await delay(200);
      return [...db.sprints];
    }
  },
  dailyLogs: {
    list: async (): Promise<DailyLog[]> => {
      await delay(200);
      return [...db.dailyLogs];
    },
    update: async (id: string, data: Partial<DailyLog>): Promise<DailyLog> => {
      await delay(300);
      const index = db.dailyLogs.findIndex(l => l.id === id);
      if (index === -1) throw new Error('Log not found');
      db.dailyLogs[index] = { ...db.dailyLogs[index], ...data, updatedAt: new Date() };
      return { ...db.dailyLogs[index] };
    },
    create: async (data: Partial<DailyLog>): Promise<DailyLog> => {
      await delay(300);
      const newLog: DailyLog = {
        id: `log-${Date.now()}`,
        date: new Date(),
        wins: data.wins || [],
        blockers: data.blockers || [],
        mood: data.mood || null,
        energy: data.energy || null,
        deepWorkMinutes: data.deepWorkMinutes || 0,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      } as DailyLog;
      db.dailyLogs.push(newLog);
      return { ...newLog };
    }
  },
  roadmapItems: {
    list: async (): Promise<RoadmapItem[]> => {
      await delay(200);
      return [...db.roadmapItems];
    }
  }
};
