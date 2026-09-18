import type { Request, Response, NextFunction } from 'express';
import jwt from 'jwt-simple';
import { redisService } from '../services/redis.service';
import type { RequestUser } from '@krama/types';

import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.decode(token as string, JWT_SECRET as string);
    if (payload.exp < Date.now()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sub: userId, sessionId, email, name } = payload;

    // Check Redis (Fast path)
    const cacheKey = `session_revoked:${sessionId}`;
    const cachedStatus = await redisService.get(cacheKey);

    if (cachedStatus === 'true') {
      return res.status(401).json({ message: 'Unauthorized' });
    } else if (cachedStatus !== 'false') {
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { revokedAt: true }
      });

      if (!dbSession || dbSession.revokedAt !== null) {
        await redisService.set(cacheKey, 'true', 3600); // cache revoked status for 1 hour
        return res.status(401).json({ message: 'Unauthorized' });
      } else {
        await redisService.set(cacheKey, 'false', 300); // cache valid status for 5 minutes
      }
    }

    req.user = { id: userId, email, name, sessionId } as RequestUser;
    next();
  } catch (error) {
    // Hide whether it's expired or invalid signature
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export { requireWorkspaceRole } from './rbac.middleware';
