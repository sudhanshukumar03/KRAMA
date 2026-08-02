import { z } from 'zod';

const WorkspaceScoped = z.object({
  workspaceId: z.string().uuid(),
});

export const CreateProjectSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  problemStatement: z.string().optional(),
  goalId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  version: z.number().int().min(1), // Required for optimistic concurrency
});

export const CreateTaskSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  version: z.number().int().min(1),
});

export const CreateGoalSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  type: z.enum(['yearly', 'quarterly']),
});

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  progress: z.number().min(0).max(100).optional(),
  version: z.number().int().min(1),
});

export const CreateHabitSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  linkedGoalId: z.string().uuid().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  expectedDurationMinutes: z.number().int().optional(),
  cadence: z.string().optional(),
});

export const UpdateHabitSchema = CreateHabitSchema.partial().extend({
  version: z.number().int().min(1),
});

export const CreatePageSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  parentPageId: z.string().uuid().optional(),
  linkedProjectId: z.string().uuid().optional(),
  blocks: z.any().optional(), // Draft.js / Editor.js JSON
});

export const UpdatePageSchema = CreatePageSchema.partial().extend({
  version: z.number().int().min(1),
});

export const CreateSprintSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['planning', 'active', 'completed']).default('planning'),
});

export const UpdateSprintSchema = CreateSprintSchema.partial().extend({
  version: z.number().int().min(1),
});

export const CreateDailyLogSchema = WorkspaceScoped.extend({
  date: z.string().datetime(), // ISO 8601 string
  wins: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  mood: z.string().optional(),
  energy: z.string().optional(),
  deepWorkMinutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const UpdateDailyLogSchema = CreateDailyLogSchema.partial().extend({
  version: z.number().int().min(1),
});

export const ReorderSchema = WorkspaceScoped.extend({
  position: z.number(), // Float
  version: z.number().int().min(1),
});

export const HabitLogSchema = z.object({
  date: z.string().datetime(), // Day logged
});
