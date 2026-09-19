import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { logActivity } from '../services/activity.service';
import { buildFocusSchedule } from '../services/focusTimer.service';
import { redisService } from '../services/redis.service';
import { socketService } from '../services/socket.service';

export const completeFocusSession = async (req: Request, res: Response) => {
  try {
    let workspaceId = req.headers['x-workspace-id'] as string;
    const userId = req.user!.id;

    if (!workspaceId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true }
      });
      if (membership) {
        workspaceId = membership.workspaceId;
      }
    }

    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const { duration, startTime, endTime, type, projectId, taskId } = req.body;
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

    // 4. Invalidate Redis schedule cache
    try {
      await redisService.del(`focus:schedule:${userId}:${workspaceId}`);
      await redisService.del(`focus:schedule:${userId}`);
    } catch (cacheErr) {
      console.warn('Redis cache invalidation warning:', cacheErr);
    }

    // 5. Emit socket event for cross-tab sync
    try {
      socketService.emitToUser(userId, 'focus:session:completed', {
        sessionId: session.id,
        duration: session.duration,
        type: session.type,
        taskId: session.taskId,
        dailyDeepWorkMinutes: dailyLog.deepWorkMinutes
      });
    } catch (sockErr) {
      console.warn('Socket emit warning:', sockErr);
    }

    return res.status(201).json({ session, dailyLog });
  } catch (error) {
    console.error('Error completing focus session:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSchedule = async (req: Request, res: Response) => {
  try {
    let workspaceId = req.headers['x-workspace-id'] as string;
    const userId = req.user!.id;

    if (!workspaceId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true }
      });
      if (membership) {
        workspaceId = membership.workspaceId;
      }
    }

    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });
    const metadata = (user?.metadata as Record<string, any>) || {};
    const timerPrefs = metadata.timerPreferences || {};

    const cacheKey = `focus:schedule:${userId}:${workspaceId}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      try {
        return res.json(JSON.parse(cached));
      } catch {}
    }

    const schedule = await buildFocusSchedule(userId, workspaceId, timerPrefs);
    await redisService.set(cacheKey, JSON.stringify(schedule), 300); // 5 min TTL
    return res.json(schedule);
  } catch (error) {
    console.error('Error fetching focus schedule:', error);
    return res.status(500).json({ message: 'Failed to build focus schedule' });
  }
};

export const getWallpaper = async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'nature';
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) {
      return res.status(200).json({ error: 'UNSPLASH_NOT_CONFIGURED', wallpapers: [] });
    }

    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(category)}&orientation=landscape&count=4`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json({ error: 'UNSPLASH_NOT_CONFIGURED', status: response.status, wallpapers: [] });
    }

    const data: any = await response.json();
    const photos = Array.isArray(data) ? data : [data];
    const wallpapers = photos.map((photo: any) => ({
      id: photo.id,
      url: photo.urls?.full || photo.urls?.regular,
      thumb: photo.urls?.thumb || photo.urls?.small,
      credit: `Photo by ${photo.user?.name || 'Unknown'} on Unsplash`,
      creditUrl: photo.links?.html || 'https://unsplash.com'
    }));

    return res.json({ wallpapers });
  } catch (error) {
    console.error('Error fetching wallpaper from Unsplash:', error);
    return res.status(200).json({ error: 'UNSPLASH_NOT_CONFIGURED', wallpapers: [] });
  }
};
