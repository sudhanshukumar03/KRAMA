import type { Router } from 'express';
import express from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  exportWorkspace
} from '../controllers/workspace.controller';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/export', requireWorkspaceRole('MEMBER'), exportWorkspace); // Must be before /:id
router.get('/:id', getWorkspace);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

export default router;
