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
export type ReorderDto = z.infer<typeof ReorderSchema>;
export type HabitLogDto = z.infer<typeof HabitLogSchema>;
