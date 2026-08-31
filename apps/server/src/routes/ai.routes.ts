import { Router } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { completeAiRequest, getUsage, getConfig, ragQuery, getDashboardInsight, analyzeTelemetry, kramaChat } from '../controllers/ai.controller';

const router: Router = Router();

// Require authentication and workspace membership for all AI routes
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

// Apply AI rate limiter to all AI routes (must run after auth to prevent spoofing)
router.use(aiLimiter);

// Routes
router.post('/complete', kramaChat);
router.post('/rag-query', kramaChat);
router.post('/narrative', async (req: any, res: any) => {
  try {
    const { narrative } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const userId = req.user?.id || 'system';
    
    if (!narrative || !workspaceId) return res.status(400).json({ error: 'Missing parameters' });
    
    const { narrativeService } = await import('../services/narrative.service');
    const result = await narrativeService.processNarrative(narrative, workspaceId, userId);
    return res.json(result);
  } catch (error: any) {
    console.error('Narrative API error:', error);
    return res.status(500).json({ error: error.message });
  }
});
router.get('/usage', getUsage);
router.get('/config', getConfig);
router.get('/dashboard-insight', getDashboardInsight);
router.post('/analyze-telemetry', analyzeTelemetry);

export default router;


