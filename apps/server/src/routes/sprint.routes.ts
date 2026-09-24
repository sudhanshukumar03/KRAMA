import type { Router } from 'express';
import express from 'express';
import { listSprints, getSprint, createSprint, updateSprint, deleteSprint, completeSprint, getSprintTasks, getSprintReport } from '../controllers/sprint.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = express.Router();

const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (!req.body) req.body = {}; if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId;
  }
  next();
};

router.use(requireAuth);
router.use(ensureWorkspaceId);

router.get('/', requireWorkspaceRole('VIEWER'), listSprints);
router.get('/:id', requireWorkspaceRole('VIEWER'), getSprint);
router.post('/', requireWorkspaceRole('MEMBER'), createSprint);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateSprint);
router.post('/:id/complete', requireWorkspaceRole('MEMBER'), completeSprint);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteSprint);
router.get('/:id/tasks', requireWorkspaceRole('VIEWER'), getSprintTasks);
router.get('/:id/reports', requireWorkspaceRole('VIEWER'), getSprintReport);
router.get('/:id/report', requireWorkspaceRole('VIEWER'), getSprintReport);

export default router;
