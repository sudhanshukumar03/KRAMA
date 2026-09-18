import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export const requireWorkspaceRole = (minRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'GUEST') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const workspaceId =
      req.headers['x-workspace-id'] ||
      (req as any).workspaceId ||
      req.params.workspaceId ||
      (req.query.workspaceId as string) ||
      (req.body && req.body.workspaceId);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Missing workspace ID in headers, params, or query' });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspaceId as string,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const roleHierarchy: Record<string, number> = {
      OWNER: 4,
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
      GUEST: 0,
    };

    if (roleHierarchy[membership.role]! < roleHierarchy[minRole]!) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    (req as any).workspaceId = workspaceId as string;
    next();
  };
};
