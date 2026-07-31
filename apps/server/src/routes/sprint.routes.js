import express from 'express';
import { listSprints, getSprint, createSprint, updateSprint, deleteSprint, getSprintTasks } from '../controllers/sprint.controller';
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
router.get('/', requireWorkspaceRole('VIEWER'), listSprints);
router.get('/:id', requireWorkspaceRole('VIEWER'), getSprint);
router.post('/', requireWorkspaceRole('MEMBER'), createSprint);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateSprint);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteSprint);
router.get('/:id/tasks', requireWorkspaceRole('VIEWER'), getSprintTasks);
export default router;
//# sourceMappingURL=sprint.routes.js.map