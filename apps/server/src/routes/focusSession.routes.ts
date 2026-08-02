import { Router } from 'express';
import { completeFocusSession } from '../controllers/focusSession.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

router.post('/', completeFocusSession);

export default router;
