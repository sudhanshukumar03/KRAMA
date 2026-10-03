import { z } from 'zod';

const WorkspaceScoped = z.object({
  workspaceId: z.string().uuid(),
});

export const CreateProjectSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  problemStatement: z.string().optional(),
  goalId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived', 'idea', 'paused', 'shipped']).default('active'),
  targetDate: z.string().nullable().optional(),
  progress: z.number().optional(),
  metadata: z.any().optional(),
  skillIds: z.array(z.string()).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  version: z.number().int().min(1), // Required for optimistic concurrency
});

export const CreateTaskSchema = WorkspaceScoped.extend({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
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
  parentGoalId: z.string().uuid().nullable().optional(),
  progress: z.number().min(0).max(100).optional().default(0),
  targetDate: z.preprocess((val) => (val === undefined ? undefined : !val ? null : new Date(val as any)), z.date().nullable().optional()),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED']).optional().default('ACTIVE'),
  icon: z.string().optional(),
  metadata: z.any().optional(),
  skillIds: z.array(z.string()).optional(),
});

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  parentGoalId: z.string().uuid().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  targetDate: z.preprocess((val) => (val === undefined ? undefined : !val ? null : new Date(val as any)), z.date().nullable().optional()),
  version: z.number().int().min(1).optional(),
});

export const CreateHabitSchema = WorkspaceScoped.extend({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  linkedGoalId: z.string().uuid().nullable().optional(),
  // Must stay in sync with HabitCategory and HabitDifficulty enums in schema.prisma 
  // No automated enforcement, this is a manual mirror.
  category: z.enum(["HEALTH", "LEARNING", "PRODUCTIVITY", "MINDFULNESS", "FINANCE", "OTHER"]).optional(),
  difficulty: z.enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "EXTREME"]).optional(),
  expectedDurationMinutes: z.number().int().min(1).max(1440).optional(),
  // Must stay in sync with real UI string values (no strict DB enum exists for these yet)
  cadence: z.enum(["daily", "weekly"]).optional(),
  scheduledDays: z.array(z.number().int().min(0).max(6)).optional(),
  // For weekly cadence: target number of completions per week (any days).
  // Stored in metadata; ignored for daily cadence.
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
  pinnedToPlanner: z.boolean().optional(),
  metadata: z.any().optional(),
});

export const UpdateHabitSchema = CreateHabitSchema.partial().extend({
  version: z.number().int().min(1).optional(),
});


export const ReorderSchema = WorkspaceScoped.extend({
  position: z.number(), // Float
  version: z.number().int().min(1),
});

// Matches the actual log payload: the web client sends a local day key (`date`,
// YYYY-MM-DD) plus a canonical UTC-noon ISO (`dateIso`); the planner sends only
// `dateIso`. Both are optional (omitting them logs "now"). `workspaceId` may
// arrive in the body on some callers.
export const HabitLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  dateIso: z.string().datetime().optional(),
  workspaceId: z.string().uuid().optional(),
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



