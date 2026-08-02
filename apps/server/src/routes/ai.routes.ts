import { Router } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { completeAiRequest, getUsage, getConfig, ragQuery } from '../controllers/ai.controller';

const router: Router = Router();

// Require authentication and workspace membership for all AI routes
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

// Apply AI rate limiter to all AI routes (must run after auth to prevent spoofing)
router.use(aiLimiter);

// Routes
router.post('/complete', completeAiRequest);
router.post('/rag-query', ragQuery);
router.get('/usage', getUsage);
router.get('/config', getConfig);

export default router;
