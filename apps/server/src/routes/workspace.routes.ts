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
    // The role check (rbac.middleware) reads x-workspace-id FIRST. The /:id
    // controllers act on req.params.id, so we must force the role check to
    // authorize against the SAME workspace the action targets — otherwise a
    // user can pass their own workspace in the header and mutate any other
    // workspace named in the path (cross-workspace IDOR).
    req.headers['x-workspace-id'] = workspaceId as string;
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
