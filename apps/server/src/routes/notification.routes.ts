import type { Router } from 'express';
import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notification.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = express.Router();

router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;
