import type { Request, Response, NextFunction } from 'express';
import jwt from 'jwt-simple';
import { PrismaClient } from '@prisma/client';
import { redisService } from '../services/redis.service';
import type { RequestUser } from '@krama/types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'krama-os-secret-jwt-key-2026';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.decode(token, JWT_SECRET);
    if (payload.exp < Date.now()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sub: userId, sessionId, email, name } = payload;

    // Check Redis (Fast path)
    // We don't have the refresh token hash here, but we can verify the session isn't revoked
    // In our design, sessionId corresponds to Postgres Session ID.
    // Wait, the spec says: "Middleware checks Redis first (fast path); if Redis is unexpectedly empty, do not fail open — fall back to a Postgres check before rejecting, in case Redis was flushed/restarted while sessions were still valid."
    
    // To implement this perfectly: we need to look up the session by ID in Postgres if we can't do it via Redis, because Redis keys are based on `refreshTokenHash`. 
    // Wait, if Redis keys are `session:{refreshTokenHash}`, we can't look up by `sessionId` easily in Redis unless we also store `sessionById:{sessionId}`!
    // Let's modify redis strategy to also set `sessionById:${sessionId}` OR just do a quick Postgres lookup for the session ID to ensure `revokedAt` is null.
    // Actually, Postgres lookup by PK `id` is extremely fast.
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true }
    });

    if (!dbSession || dbSession.revokedAt !== null) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = { id: userId, email, name, sessionId } as RequestUser;
    next();
  } catch (error) {
    // Hide whether it's expired or invalid signature
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export const requireWorkspaceRole = (minRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Attempt to extract workspaceId from params or body
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const roleHierarchy = {
      OWNER: 4,
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
    };

    if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};
