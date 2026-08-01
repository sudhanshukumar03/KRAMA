// @ts-nocheck
import type { Router } from 'express';
import express from 'express';
import { listDailyLogs, getDailyLog, createDailyLog, updateDailyLog } from '../controllers/dailyLog.controller';
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

router.get('/', requireWorkspaceRole('MEMBER'), listDailyLogs);
router.get('/:id', requireWorkspaceRole('MEMBER'), getDailyLog);
router.post('/', requireWorkspaceRole('MEMBER'), createDailyLog);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateDailyLog);

export default router;
