import { Router } from 'express';
import { WorkspaceSearchQuerySchema } from '@krama/validation';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { handleControllerError } from '../utils/errors';
import { searchWorkspace } from '../services/workspaceSearch.service';

const router: Router = Router();
router.use(requireAuth);
router.use(requireWorkspaceRole('VIEWER'));
router.get('/recent', async (req, res) => {
  if (!req.workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  try { return res.json({ results: await searchWorkspace(req.workspaceId, '', 6) }); }
  catch (error) { return handleControllerError(res, error, 'Recent items are unavailable'); }
});
router.get('/', async (req, res) => {
  if (!req.workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  try {
    const { q } = WorkspaceSearchQuerySchema.parse(req.query);
    return res.json({ results: q ? await searchWorkspace(req.workspaceId, q) : [] });
  } catch (error) { return handleControllerError(res, error, 'Search is unavailable'); }
});
export default router;
