import type { Router } from 'express';
import express from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  exportWorkspace
} from '../controllers/workspace.controller';

const router: Router = express.Router();

const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.params.id || req.headers['x-workspace-id'] || req.query.workspaceId;
  if (workspaceId) {
    (req as any).workspaceId = workspaceId;
  }
  next();
};

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/export', requireWorkspaceRole('MEMBER'), exportWorkspace); // Must be before /:id
router.get('/:id', ensureWorkspaceId, requireWorkspaceRole('VIEWER'), getWorkspace);
router.patch('/:id', ensureWorkspaceId, requireWorkspaceRole('OWNER'), updateWorkspace);
router.delete('/:id', ensureWorkspaceId, requireWorkspaceRole('OWNER'), deleteWorkspace);

export default router;
