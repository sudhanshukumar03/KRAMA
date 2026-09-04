import type { Router } from 'express';
import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/upload.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.post('/', upload.single('file'), uploadFile);

export default router;
