import express from 'express';
import { signup, login, refresh, logout, logoutAll, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { strictAuthLimiter, refreshLimiter } from '../middlewares/rateLimit.middleware';

const router = express.Router();

router.post('/signup', strictAuthLimiter, signup);
router.post('/login', strictAuthLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);

export default router;
