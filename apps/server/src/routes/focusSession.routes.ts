import { Router } from 'express';
import { completeFocusSession, getSchedule, getWallpaper } from '../controllers/focusSession.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

import { prisma } from '../prisma';

const router: Router = Router();

router.use(requireAuth);
router.get('/wallpaper', getWallpaper);

const ensureFocusWorkspace = async (req: any, res: any, next: any) => {
  let workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId;
  if (!workspaceId && req.user?.id) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.user.id },
      select: { workspaceId: true }
    });
    if (membership) {
      workspaceId = membership.workspaceId;
      req.headers['x-workspace-id'] = workspaceId;
    }
  }
  if (workspaceId) {
    if (!req.body) req.body = {};
    req.body.workspaceId = workspaceId;
  }
  next();
};

router.use(ensureFocusWorkspace);
router.use(requireWorkspaceRole('MEMBER'));
router.get('/schedule', getSchedule);
router.post('/', completeFocusSession);

export default router;
