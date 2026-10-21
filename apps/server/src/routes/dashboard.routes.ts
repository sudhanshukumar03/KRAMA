import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { personalDayRequest } from '../controllers/personalDay.controller';

const router: Router = Router();

// Apply auth middleware to all routes in this file
router.use(requireAuth);
router.use(requireWorkspaceRole('VIEWER'));

router.get('/', getDashboardData);
router.get('/day-plan', personalDayRequest);
router.put('/day-plan', requireWorkspaceRole('MEMBER'), personalDayRequest);

export default router;
