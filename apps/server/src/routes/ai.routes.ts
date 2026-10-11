import { Router } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { getUsage, getConfig, getDashboardInsight, analyzeTelemetry, kramaChat } from '../controllers/ai.controller';

const router: Router = Router();

// Require authentication and workspace membership for all AI routes
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

// Reading settings or usage must not consume the generation allowance. Apply
// the shared workspace limit only to routes that can call an AI provider.
router.post('/complete', aiLimiter, kramaChat);
router.post('/rag-query', aiLimiter, kramaChat);
router.get('/usage', getUsage);
router.get('/config', getConfig);
router.get('/dashboard-insight', aiLimiter, getDashboardInsight);
router.post('/analyze-telemetry', aiLimiter, analyzeTelemetry);

export default router;
