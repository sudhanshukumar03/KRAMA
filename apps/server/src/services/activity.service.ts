import { prisma } from '../prisma';

export async function logActivity({
  userId,
  workspaceId,
  action,
  entityType,
  entityId,
  metadata
}: {
  userId: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        metadata
      }
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
