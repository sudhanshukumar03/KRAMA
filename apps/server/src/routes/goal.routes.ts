import express from 'express';
import { listGoals, getGoal, createGoal, updateGoal, deleteGoal } from '../controllers/goal.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router = express.Router();

const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId;
  }
  next();
};

router.use(requireAuth);
router.use(ensureWorkspaceId);

router.get('/', requireWorkspaceRole('VIEWER'), listGoals);
router.get('/:id', requireWorkspaceRole('VIEWER'), getGoal);
router.post('/', requireWorkspaceRole('MEMBER'), createGoal);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateGoal);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteGoal);

export default router;
