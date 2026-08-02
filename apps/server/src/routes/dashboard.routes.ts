import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = Router();

// Apply auth middleware to all routes in this file
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

router.get('/', getDashboardData);

export default router;
