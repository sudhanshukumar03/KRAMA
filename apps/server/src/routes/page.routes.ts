import type { Router } from 'express';
import express from 'express';
import { listPages, getPage, createPage, updatePage, deletePage, restorePage } from '../controllers/page.controller';
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

router.get('/', requireWorkspaceRole('VIEWER'), listPages);
router.get('/:id', requireWorkspaceRole('VIEWER'), getPage);
router.post('/', requireWorkspaceRole('MEMBER'), createPage);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updatePage);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deletePage);
router.post('/:id/restore', requireWorkspaceRole('MEMBER'), restorePage);

export default router;
