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
    const payload = jwt.decode(token as string, JWT_SECRET as string, false, 'HS256');
    // exp is a NumericDate (seconds); compare against ms epoch. jwt-simple also
    // enforces this internally, so this is defense-in-depth.
    if (payload.exp * 1000 < Date.now()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sub: userId, sessionId, email, name } = payload;
    if (typeof userId !== 'string' || !userId || typeof sessionId !== 'string' || !sessionId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Require shared Redis availability, reject cached revocations, and use the
    // database as the authority for active status and session ownership.
    const cacheKey = `session_revoked:${sessionId}`;
    const cachedStatus = await redisService.getShared(cacheKey);

    if (cachedStatus === 'true') {
      return res.status(401).json({ message: 'Unauthorized' });
    } else {
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, revokedAt: true }
      });

      if (!dbSession || dbSession.userId !== userId || dbSession.revokedAt !== null) {
        await redisService.set(cacheKey, 'true', 3600); // cache revoked status for 1 hour
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }

    req.user = { id: userId, email, name, sessionId } as RequestUser;
    next();
  } catch {
    // Hide whether it's expired or invalid signature
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export { requireWorkspaceRole } from './rbac.middleware';
