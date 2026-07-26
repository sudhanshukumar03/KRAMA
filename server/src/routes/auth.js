import express, {} from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';
const router = express.Router();
// Rate limiter for login endpoint (20 requests per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login requests per windowMs
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }
    const user = {
        id: 'krama-user-1',
        username: username || 'engineer',
        role: 'owner',
    };
    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({
        message: 'Authentication successful',
        user,
        token,
    });
});
router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});
router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});
export default router;
//# sourceMappingURL=auth.js.map