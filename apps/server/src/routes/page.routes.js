import express from 'express';
import { listPages, getPage, createPage, updatePage, deletePage } from '../controllers/page.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
const router = express.Router();
const ensureWorkspaceId = (req, res, next) => {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (!req.body)
        req.body = {};
    if (workspaceId && !req.body.workspaceId) {
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
export default router;
//# sourceMappingURL=page.routes.js.map