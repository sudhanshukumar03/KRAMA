import { Router } from 'express';
import { listRules, createRule, updateRule, deleteRule } from '../controllers/automation.controller';

const router: import('express').Router = Router();

router.get('/', listRules);
router.post('/', createRule);
router.patch('/:id', updateRule);
router.delete('/:id', deleteRule);

export default router;
