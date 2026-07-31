import jwt from 'jsonwebtoken';
import { config } from '../config';
export const requireAuth = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ error: 'Unauthorized: No authentication token provided' });
            return;
        }
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};
//# sourceMappingURL=auth.js.map