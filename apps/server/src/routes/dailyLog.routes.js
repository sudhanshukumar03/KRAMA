import express from 'express';
import { listDailyLogs, getDailyLog, createDailyLog, updateDailyLog } from '../controllers/dailyLog.controller';
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
router.get('/', requireWorkspaceRole('MEMBER'), listDailyLogs);
router.get('/:id', requireWorkspaceRole('MEMBER'), getDailyLog);
router.post('/', requireWorkspaceRole('MEMBER'), createDailyLog);
router.patch('/:id', requireWorkspaceRole('MEMBER'), updateDailyLog);
export default router;
//# sourceMappingURL=dailyLog.routes.js.map