import { z } from 'zod';
import {
  CreateGoalSchema,
  UpdateGoalSchema,
} from '@krama/validation';

export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;
