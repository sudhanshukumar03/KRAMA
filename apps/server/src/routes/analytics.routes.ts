import type { Router } from 'express';
import express from 'express';
import { getOverview, getFocusHistory, getHabitHeatmap } from '../controllers/analytics.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = express.Router();

const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (!req.body) req.body = {}; 
  if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId;
  }
  next();
};

router.use(requireAuth);
router.use(ensureWorkspaceId);

router.get('/overview', requireWorkspaceRole('VIEWER'), getOverview);
router.get('/focus-history', requireWorkspaceRole('VIEWER'), getFocusHistory);
router.get('/habit-heatmap', requireWorkspaceRole('VIEWER'), getHabitHeatmap);

export default router;
