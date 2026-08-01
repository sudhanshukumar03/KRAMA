import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, } from '../controllers/workspace.controller';
const router = express.Router();
router.use(requireAuth);
router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
export default router;
//# sourceMappingURL=workspace.routes.js.map