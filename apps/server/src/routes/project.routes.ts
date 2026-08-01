// @ts-nocheck
import type { Router } from 'express';
import express from 'express';
import { listProjects, getProject, createProject, updateProject, deleteProject, reorderProject } from '../controllers/project.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = express.Router();

// Middleware to extract workspaceId from header or query for RBAC if not in body
const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (!req.body) req.body = {}; if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId; // Inject for requireWorkspaceRole
  }
  next();
};

router.use(requireAuth);
router.use(ensureWorkspaceId);

router.get('/', requireWorkspaceRole('VIEWER'), listProjects);
router.get('/:id', requireWorkspaceRole('VIEWER'), getProject);
router.post('/', requireWorkspaceRole('MEMBER'), createProject);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateProject);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteProject); // Requires ADMIN to soft-delete
router.patch('/:id/reorder', requireWorkspaceRole('MEMBER'), reorderProject);

export default router;
