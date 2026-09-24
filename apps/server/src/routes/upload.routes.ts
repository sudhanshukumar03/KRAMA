import type { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/upload.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(requireAuth);

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'Payload Too Large: File exceeds 10MB limit' });
        }
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  },
  uploadFile
);

export default router;
