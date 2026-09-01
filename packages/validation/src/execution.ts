import { z } from 'zod';

const WorkspaceScoped = z.object({
  workspaceId: z.string().uuid(),
});

export const CreateProjectSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  problemStatement: z.string().optional(),
  goalId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  skillIds: z.array(z.string()).optional(),
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
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELED']).default('TODO'),
  priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  blockedById: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  estimateMinutes: z.number().int().min(0).optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  skillIds: z.array(z.string()).optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  version: z.number().int().min(1).optional(),
  position: z.number().optional(),
});

export const CreateGoalSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  type: z.string(), // Allowing "SKILL" type
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED']).optional().default('ACTIVE'),
  icon: z.string().optional(),
  metadata: z.any().optional(),
  skillIds: z.array(z.string()).optional(),
});

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  progress: z.number().min(0).max(100).optional(),
  version: z.number().int().min(1),
});

export const CreateHabitSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  linkedGoalId: z.string().uuid().optional(),
  // Must stay in sync with HabitCategory and HabitDifficulty enums in schema.prisma 
  // No automated enforcement, this is a manual mirror.
  category: z.enum(["HEALTH", "LEARNING", "PRODUCTIVITY", "MINDFULNESS", "FINANCE", "OTHER"]).optional(),
  difficulty: z.enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "EXTREME"]).optional(),
  expectedDurationMinutes: z.number().int().min(1).max(1440).optional(),
  // Must stay in sync with real UI string values (no strict DB enum exists for these yet)
  cadence: z.enum(["daily", "weekly"]).optional(),
  scheduledDays: z.array(z.number().int().min(0).max(6)).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
  skillIds: z.array(z.string()).optional(),
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

export const CreateDecisionSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  rationale: z.string().nullable().optional(),
  outcomes: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  metadata: z.union([z.string(), z.record(z.any())]).nullable().optional(),
  createdAt: z.string().datetime().optional()
});

export const UpdateDecisionSchema = CreateDecisionSchema.partial().extend({
  version: z.number().int().min(1).optional(),
});



