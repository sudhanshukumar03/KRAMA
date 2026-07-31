import { z } from 'zod';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  CreateHabitSchema,
  UpdateHabitSchema,
  CreatePageSchema,
  UpdatePageSchema,
  CreateSprintSchema,
  UpdateSprintSchema,
  CreateDailyLogSchema,
  UpdateDailyLogSchema,
  ReorderSchema,
  HabitLogSchema,
} from '@krama/validation';

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;
export type CreateHabitDto = z.infer<typeof CreateHabitSchema>;
export type UpdateHabitDto = z.infer<typeof UpdateHabitSchema>;
export type CreatePageDto = z.infer<typeof CreatePageSchema>;
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;
export type CreateSprintDto = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintDto = z.infer<typeof UpdateSprintSchema>;
export type CreateDailyLogDto = z.infer<typeof CreateDailyLogSchema>;
export type UpdateDailyLogDto = z.infer<typeof UpdateDailyLogSchema>;
export type ReorderDto = z.infer<typeof ReorderSchema>;
export type HabitLogDto = z.infer<typeof HabitLogSchema>;
