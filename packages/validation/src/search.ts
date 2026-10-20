import { z } from 'zod';
export const WorkspaceSearchQuerySchema = z.object({ q: z.string().trim().max(2000).default('') });
