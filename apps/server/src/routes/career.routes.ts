import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { 
  getOverview, 
  getDetail, 
  createSkill, 
  updateSkill, 
  deleteSkill 
} from '../controllers/career.controller';

const router = Router();

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/:id', getDetail);
router.post('/', createSkill);
router.patch('/:id', updateSkill);
router.delete('/:id', deleteSkill);

export default router;