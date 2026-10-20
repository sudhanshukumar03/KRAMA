import type { Request, Response } from 'express';
import { z } from 'zod';
import { getPersonalDay, savePersonalDay } from '../services/personalDay.service';

const inputSchema = z.object({
  taskIds: z.array(z.string().uuid()).max(3).optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  review: z.object({ taskId: z.string().uuid(), version: z.number().int().positive(), action: z.enum(['tomorrow', 'backlog', 'cancel']) }).optional(),
}).refine(value => (value.taskIds !== undefined) !== (value.review !== undefined), 'Submit priorities or a review action.')
  .refine(value => value.taskIds === undefined || value.expectedRevision !== undefined, 'Reload your daily plan before changing priorities.');

export async function personalDayRequest(req: Request, res: Response) {
  try {
    const workspaceId = (req as any).workspaceId as string;
    const date = String(req.query.date || '');
    const result = req.method === 'GET'
      ? await getPersonalDay(workspaceId, req.user!.id, date)
      : await savePersonalDay(workspaceId, req.user!.id, date, inputSchema.parse(req.body));
    return res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.issues[0]?.message || 'Invalid daily plan.' });
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Could not save the daily plan.' });
  }
}
