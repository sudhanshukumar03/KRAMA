import express from 'express';
import { listTasks, getTask, createTask, updateTask, deleteTask, reorderTask, completeTask } from '../controllers/task.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router = express.Router();

const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (!req.body) req.body = {}; if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId; // Inject for requireWorkspaceRole
  }
  next();
};

router.use(requireAuth);
router.use(ensureWorkspaceId);

router.get('/', requireWorkspaceRole('VIEWER'), listTasks);
router.get('/:id', requireWorkspaceRole('VIEWER'), getTask);
router.post('/', requireWorkspaceRole('MEMBER'), createTask);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateTask);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteTask);
router.patch('/:id/reorder', requireWorkspaceRole('MEMBER'), reorderTask);
router.patch('/:id/complete', requireWorkspaceRole('MEMBER'), completeTask);

export default router;
