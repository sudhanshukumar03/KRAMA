import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export const WORKSPACE_ROLE_LEVELS = {
  OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1, GUEST: 0,
} as const;

// Derive the socket read policy from the same hierarchy used by HTTP.
export const WORKSPACE_READ_ROLES = (Object.keys(WORKSPACE_ROLE_LEVELS) as Array<keyof typeof WORKSPACE_ROLE_LEVELS>)
  .filter(role => WORKSPACE_ROLE_LEVELS[role] >= WORKSPACE_ROLE_LEVELS.VIEWER);

export const requireWorkspaceRole = (minRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'GUEST') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    let finalWorkspaceId = (
      req.headers['x-workspace-id'] ||
      (req as any).workspaceId ||
      req.params.workspaceId ||
      (req.query.workspaceId as string) ||
      (req.body && req.body.workspaceId)
    ) as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!finalWorkspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId, workspace: { deletedAt: null } },
        select: { workspaceId: true },
      });
      if (member) {
        finalWorkspaceId = member.workspaceId;
      }
    }

    if (!finalWorkspaceId) {
      return res.status(400).json({ message: 'Missing workspace ID in headers, params, or query' });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: finalWorkspaceId,
        },
        workspace: { deletedAt: null },
      },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (WORKSPACE_ROLE_LEVELS[membership.role] < WORKSPACE_ROLE_LEVELS[minRole]) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    (req as any).workspaceId = finalWorkspaceId;
    req.headers['x-workspace-id'] = finalWorkspaceId;
    next();
  };
};
