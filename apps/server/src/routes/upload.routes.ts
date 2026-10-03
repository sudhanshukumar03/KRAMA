import type { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/upload.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = express.Router();

// The upload endpoint serves objects from a public R2 URL, so restrict it to
// inert raster image types. SVG is deliberately excluded (it can carry script
// and would be served with an active content-type => stored XSS).
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP'));
    }
  },
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
