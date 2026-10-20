import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }
    const userId = (req as any).user?.id as string;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.query.page === 'true') {
      const limit = Number(req.query.limit ?? 50);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ message: 'Notification limit must be between 1 and 100' });
      }
      let after: { id: string; createdAt: Date } | undefined;
      if (req.query.cursor !== undefined) {
        try {
          if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 512) throw new Error();
          const decoded = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString('utf8'));
          if (typeof decoded.id !== 'string' || !decoded.id || decoded.id.length > 128 || typeof decoded.createdAt !== 'string') throw new Error();
          const createdAt = new Date(decoded.createdAt);
          if (!Number.isFinite(createdAt.getTime())) throw new Error();
          after = { id: decoded.id, createdAt };
        } catch {
          return res.status(400).json({ message: 'Invalid notification cursor' });
        }
      }
      const scope = { workspaceId, userId };
      const where: Prisma.NotificationWhereInput = {
        ...scope,
        ...(after ? { OR: [
          { createdAt: { lt: after.createdAt } },
          { createdAt: after.createdAt, id: { lt: after.id } },
        ] } : {}),
      };
      const [records, unreadCount] = await prisma.$transaction([
        prisma.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1 }),
        prisma.notification.count({ where: { ...scope, read: false } }),
      ], { isolationLevel: 'RepeatableRead' });
      const hasMore = records.length > limit;
      const items = records.slice(0, limit);
      const last = items[items.length - 1];
      const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString() })).toString('base64url') : null;
      return res.json({ items, nextCursor, unreadCount });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        workspaceId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;
    const userId = (req as any).user?.id as string;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.workspaceId !== workspaceId || notification.userId !== userId) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }
    const userId = (req as any).user?.id as string;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await prisma.notification.updateMany({
      where: {
        workspaceId,
        userId,
        read: false,
      },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

