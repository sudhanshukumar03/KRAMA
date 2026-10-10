import { v5 as uuidv5 } from 'uuid';
import type { PrismaClient } from '@prisma/client';

export interface CompletionAward {
  taskId: string;
  workspaceId: string;
  userId: string;
  completionVersion?: number;
}

// Notification's existing primary key is the durable idempotency marker.
// Creating it and awarding points commit together; even a post-commit retry is safe.
export async function awardTaskCompletion(db: PrismaClient, data: CompletionAward, jobId?: string) {
  const eventKey = data.completionVersion ?? jobId;
  if (eventKey === undefined) throw new Error('Completion event identity is required.');
  const id = uuidv5(`${data.workspaceId}/${data.taskId}/${eventKey}`, uuidv5.URL);
  try {
    return await db.$transaction(async tx => {
      const task = await tx.task.findFirst({ where: { id: data.taskId, workspaceId: data.workspaceId, deletedAt: null } });
      const notification = await tx.notification.create({ data: {
        id, userId: data.userId, workspaceId: data.workspaceId,
        title: 'Task Completed', message: `You earned 10 points for completing: ${task?.title || 'a task'}!`,
        metadata: { taskId: data.taskId, completionEvent: String(eventKey) },
      } });
      await tx.workspace.update({ where: { id: data.workspaceId }, data: { productivityScore: { increment: 10 } } });
      return notification;
    });
  } catch (error: any) {
    if (error.code !== 'P2002') throw error;
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) throw error;
    return existing;
  }
}
