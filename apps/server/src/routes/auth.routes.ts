import type { Router } from 'express';
import express from 'express';
import { signup, login, refresh, logout, logoutAll, me, updatePreferences } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { strictAuthLimiter, refreshLimiter } from '../middlewares/rateLimit.middleware';

const router: Router = express.Router();

router.post('/signup', strictAuthLimiter, signup);
router.post('/login', strictAuthLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.patch('/me/preferences', requireAuth, updatePreferences);

export default router;
