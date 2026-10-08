import { Router, type Request, type Response } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { TimeBlockSchema, TimeBlockUpdateSchema, MilestoneSchema, MilestoneUpdateSchema, RoutineOccurrenceSchema, WeekQuerySchema } from '@krama/validation';
import { plannerService, PlannerError } from '../services/planner.service';

const router: Router = Router();
function context(req: Request) {
  return { userId: req.user!.id, workspaceId: (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || '', id: req.params.id as string | undefined };
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
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Planner week error:', error);
    return res.status(500).json({ 
      code: 'PLANNER_WEEK_FAILED', 
      message: error?.message || 'Unable to load Planner' 
    });
  }
});

router.post('/time-blocks', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.createTimeBlock(context(req), TimeBlockSchema.parse(req.body));
    return res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Create time block:', error);
    return res.status(400).json({ code: 'TIME_BLOCK_CREATE_FAILED', message: 'Unable to create time block' });
  }
});

router.patch('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateTimeBlock(context(req), TimeBlockUpdateSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Update time block:', error);
    return res.status(400).json({ code: 'TIME_BLOCK_UPDATE_FAILED', message: 'Unable to update time block' });
  }
});

router.delete('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    await plannerService.deleteTimeBlock(context(req));
    return res.status(204).send();
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Delete time block:', error);
    return res.status(500).json({ message: 'Unable to delete time block' });
  }
});

router.patch('/routine-occurrences', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateRoutineOccurrence(context(req), RoutineOccurrenceSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Routine update:', error);
    return res.status(400).json({ message: error?.message || 'Unable to update routine' });
  }
});

router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const result = await plannerService.listMilestones(context(req), weekQuery(req));
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('List milestones:', error);
    return res.status(400).json({ message: 'Unable to load milestones' });
  }
});

router.post('/milestones', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.createMilestone(context(req), MilestoneSchema.parse(req.body));
    return res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Create milestone:', error);
    return res.status(400).json({ message: 'Unable to create milestone' });
  }
});

router.patch('/milestones/:id', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.updateMilestone(context(req), MilestoneUpdateSchema.parse(req.body));
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Update milestone:', error);
    return res.status(400).json({ message: 'Unable to update milestone' });
  }
});

router.delete('/milestones/:id', requireWorkspaceRole('MEMBER'), async (req: Request, res: Response) => {
  try {
    const result = await plannerService.deleteMilestone(context(req));
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof PlannerError) return res.status(error.statusCode).json(error.payload);
    console.error('Delete milestone:', error);
    return res.status(400).json({ message: 'Unable to delete milestone' });
  }
});

export default router;
