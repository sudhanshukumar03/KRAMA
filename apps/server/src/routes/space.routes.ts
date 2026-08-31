import { Router } from 'express';
import { listSpaces, createSpace, updateSpace, deleteSpace } from '../controllers/space.controller';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(requireAuth);

router.get('/', requireWorkspaceRole('VIEWER'), listSpaces);
router.post('/', requireWorkspaceRole('MEMBER'), createSpace);
router.put('/:id', requireWorkspaceRole('MEMBER'), updateSpace);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteSpace);

export default router;
