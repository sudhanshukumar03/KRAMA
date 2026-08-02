import type { Request, Response } from 'express';
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
