import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { logActivity } from '../services/activity.service';

export const completeFocusSession = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string;
    const userId = req.user!.id;
    const { duration, startTime, endTime, type, projectId, taskId } = req.body;

    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    if (!duration || !startTime) return res.status(400).json({ message: 'duration and startTime are required' });

    // 1. Save FocusSession
    const session = await prisma.focusSession.create({
      data: {
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : new Date(),
        duration,
        completed: true,
        type: type || 'pomodoro',
        projectId,
        taskId,
        userId,
        workspaceId
      }
    });

    // 2. Update DailyLog
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyLog = await prisma.dailyLog.findUnique({
      where: {
        userId_workspaceId_date: {
          userId,
          workspaceId,
          date: today
        }
      }
    });

    const durationMinutes = Math.round(duration / 60);

    if (dailyLog) {
      dailyLog = await prisma.dailyLog.update({
        where: { id: dailyLog.id },
        data: {
          deepWorkMinutes: (dailyLog.deepWorkMinutes || 0) + durationMinutes
        }
      });
    } else {
      dailyLog = await prisma.dailyLog.create({
        data: {
          date: today,
          deepWorkMinutes: durationMinutes,
          userId,
          workspaceId
        }
      });
    }

    // 3. Log Activity
    await logActivity({
      userId,
      workspaceId,
      action: 'POMODORO_COMPLETED',
      entityType: 'FocusSession',
      entityId: session.id,
      metadata: { duration, type }
    });

    return res.status(201).json({ session, dailyLog });
  } catch (error) {
    console.error('Error completing focus session:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
