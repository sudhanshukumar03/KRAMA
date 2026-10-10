import { Router, type Request, type Response } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { TimeBlockSchema, TimeBlockUpdateSchema, MilestoneSchema, MilestoneUpdateSchema, RoutineOccurrenceSchema, WeekQuerySchema } from '@krama/validation';
import { plannerService, PlannerError, type PlannerContext } from '../services/planner.service';
import { handleControllerError } from '../utils/errors';

const router: Router = Router();
function context(req: Request): PlannerContext {
  return { userId: req.user!.id, workspaceId: (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || '', id: req.params.id as string | undefined };
}

function respondError(res: Response, error: unknown, message: string) {
  if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
  return handleControllerError(res, error, message);
}
router.use(requireAuth);
router.use(requireWorkspaceRole('VIEWER'));
router.use(async (req, res, next) => {
  const { userId, workspaceId } = context(req);
  if (!workspaceId) return next();
  try {
    if (!await plannerService.hasWorkspaceAccess(userId, workspaceId)) return res.status(403).json({ message: 'Forbidden: Not a member of this workspace' });
    next();
  } catch { return res.status(500).json({ message: 'Unable to verify workspace access' }); }
});

function weekQuery(req: Request) {
  const parsed = WeekQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new PlannerError(400, { message: 'start and end must be valid YYYY-MM-DD date query params' });
  return parsed.data;
}

router.get('/week', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.getWeek(context(req), weekQuery(req));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to load Planner');
  }
});

router.post('/time-blocks', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.createTimeBlock(context(req), TimeBlockSchema.parse(req.body));
    return res.status(201).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to create time block');
  }
});

router.patch('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateTimeBlock(context(req), TimeBlockUpdateSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to update time block');
  }
});

router.delete('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    await plannerService.deleteTimeBlock(context(req));
    return res.status(204).send();
  } catch (error) {
    return respondError(res, error, 'Unable to delete time block');
  }
});

router.patch('/routine-occurrences', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateRoutineOccurrence(context(req), RoutineOccurrenceSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to update routine');
  }
});

router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.listMilestones(context(req), weekQuery(req));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to load milestones');
  }
});

router.post('/milestones', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.createMilestone(context(req), MilestoneSchema.parse(req.body));
    return res.status(201).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to create milestone');
  }
});

router.patch('/milestones/:id', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateMilestone(context(req), MilestoneUpdateSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to update milestone');
  }
});

router.delete('/milestones/:id', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.deleteMilestone(context(req));
    return res.status(200).json(result);
  } catch (error) {
    return respondError(res, error, 'Unable to delete milestone');
  }
});

export default router;
