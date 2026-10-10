import type { Router } from 'express';
import express from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = express.Router();

router.use(requireAuth);
// Notifications are per-user reads; any workspace member including VIEWER may access.
router.use(requireWorkspaceRole('VIEWER'));

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
