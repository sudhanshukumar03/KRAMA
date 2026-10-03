import { z } from 'zod';
import {
  TimeBlockSchema,
  TimeBlockUpdateSchema,
  MilestoneSchema,
  MilestoneUpdateSchema,
  RoutineOccurrenceSchema,
  WeekQuerySchema,
  HolidayQuerySchema,
} from '@krama/validation';

export type TimeBlockDto = z.infer<typeof TimeBlockSchema>;
export type TimeBlockUpdateDto = z.infer<typeof TimeBlockUpdateSchema>;
export type MilestoneDto = z.infer<typeof MilestoneSchema>;
export type MilestoneUpdateDto = z.infer<typeof MilestoneUpdateSchema>;
export type RoutineOccurrenceDto = z.infer<typeof RoutineOccurrenceSchema>;
export type WeekQueryDto = z.infer<typeof WeekQuerySchema>;
export type HolidayQueryDto = z.infer<typeof HolidayQuerySchema>;
