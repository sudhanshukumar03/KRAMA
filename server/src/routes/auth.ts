import express, { type Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'krama-os-secret-jwt-key-2026';

router.post('/login', (req, res: Response): void => {
  const { username, password } = req.body;

  // Single-user Engineering OS default authentication
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = {
    id: 'krama-user-1',
    username: username || 'engineer',
    role: 'owner',
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: 'Authentication successful',
    user,
    token,
  });
});

router.post('/logout', (_req, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
