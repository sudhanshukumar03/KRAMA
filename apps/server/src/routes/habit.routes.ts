import type { Router } from 'express';
import express from 'express';
import { listHabits, getHabit, createHabit, updateHabit, deleteHabit, logHabit, getStreak, restoreHabit } from '../controllers/habit.controller';
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

router.get('/', requireWorkspaceRole('VIEWER'), listHabits);
router.get('/:id', requireWorkspaceRole('VIEWER'), getHabit);
router.post('/', requireWorkspaceRole('MEMBER'), createHabit);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateHabit);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteHabit);
router.post('/:id/restore', requireWorkspaceRole('MEMBER'), restoreHabit);
router.post('/:id/log', requireWorkspaceRole('MEMBER'), logHabit);
router.get('/:id/streak', requireWorkspaceRole('VIEWER'), getStreak);

export default router;
