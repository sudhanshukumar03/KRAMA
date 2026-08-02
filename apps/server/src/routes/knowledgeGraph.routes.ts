import { Router } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { getKnowledgeGraph } from '../controllers/knowledgeGraph.controller';

const router: Router = Router();

// Secure route: requires authentication and membership in the target workspace
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));

router.get('/', getKnowledgeGraph);

export default router;
