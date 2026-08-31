import { Router } from 'express';
import { 
  listDecisions, 
  createDecision, 
  updateDecision, 
  deleteDecision,
  restoreDecision
} from '../controllers/decision.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(requireAuth);

router.get('/', listDecisions);
router.post('/', createDecision);
router.put('/:id', updateDecision);
router.delete('/:id', deleteDecision);
router.post('/:id/restore', restoreDecision);

export default router;

