import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createHash } from 'node:crypto';
import { buildFocusSchedule } from '../services/focusTimer.service';
import { socketService } from '../services/socket.service';

export const completeFocusSession = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId || req.headers['x-workspace-id'] || req.body?.workspaceId;
    const userId = req.user!.id;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    const { duration, startTime, endTime, type, projectId, taskId, completionId } = req.body;
    const numDuration = Number(duration);
    if (!Number.isInteger(numDuration) || numDuration <= 0 || numDuration > 86400) return res.status(400).json({ message: 'duration must be a positive number of seconds (up to 86400)' });
    const parsedStart = new Date(startTime);
    const parsedEnd = endTime ? new Date(endTime) : new Date();
    if (!startTime || Number.isNaN(+parsedStart) || Number.isNaN(+parsedEnd) || parsedEnd < parsedStart) return res.status(400).json({ message: 'Provide valid session start and end times.' });
    // Allow a small client clock offset and one second of timer rounding.
    // Paused sessions may report less work than elapsed time; offline history
    // remains valid. Completed work must fit a non-empty interval.
    const elapsedMs = +parsedEnd - +parsedStart;
    if (elapsedMs <= 0 || numDuration > Math.ceil(elapsedMs / 1000) || +parsedEnd > Date.now() + 30_000) {
      return res.status(400).json({ message: 'Completed duration must fit the session interval, and end time cannot be in the future.' });
    }
    const allowed = ['pomodoro', 'short_break', 'long_break', 'custom', 'clock'];
    const sessionType = typeof type === 'string' && allowed.includes(type) ? type : 'pomodoro';
    if (completionId !== undefined && (typeof completionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(completionId))) return res.status(400).json({ message: 'Invalid completion identifier' });
    // The primary key is the durable idempotency key. Older clients get a stable
    // key for the exact same session window, without requiring a schema change.
    const digest = createHash('sha256').update(JSON.stringify([userId, workspaceId, parsedStart.toISOString(), endTime ? parsedEnd.toISOString() : null, sessionType])).digest('hex').slice(0, 32);
    const id = completionId || `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`;
    const [task, project] = await Promise.all([
      taskId ? prisma.task.findFirst({ where: { id: taskId, workspaceId, deletedAt: null }, select: { id: true } }) : null,
      projectId ? prisma.project.findFirst({ where: { id: projectId, workspaceId, deletedAt: null }, select: { id: true } }) : null,
    ]);
    const replay = async () => {
      const existing = await prisma.focusSession.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId || existing.workspaceId !== workspaceId || existing.duration !== numDuration || existing.type !== sessionType || (existing.taskId !== (taskId || null) && existing.taskId !== (task?.id || null)) || (existing.projectId !== (projectId || null) && existing.projectId !== (project?.id || null)) || +existing.startTime !== +parsedStart || (endTime && +existing.endTime! !== +parsedEnd)) return null;
      return existing;
    };
    let session = await replay();
    if (!session) {
      try {
        session = await prisma.$transaction(async tx => {
          const created = await tx.focusSession.create({ data: { id, startTime: parsedStart, endTime: parsedEnd, duration: numDuration, completed: true, type: sessionType, projectId: project?.id || null, taskId: task?.id || null, userId, workspaceId } });
          await tx.activityLog.create({ data: { userId, workspaceId, action: 'POMODORO_COMPLETED', entityType: 'FocusSession', entityId: created.id, metadata: { duration: numDuration, type: sessionType } } });
          return created;
        });
      } catch (error: any) {
        if (error.code !== 'P2002') throw error;
        session = await replay();
        if (!session) return res.status(409).json({ message: 'This completion identifier was already used for a different session.' });
      }
    }
    socketService.emitToUser(userId, 'focus:session:completed', { sessionId: session.id, workspaceId, duration: session.duration, type: session.type, taskId: session.taskId });
    return res.status(201).json({ session });
  } catch (error) {
    console.error('Error completing focus session:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSchedule = async (req: Request, res: Response) => {
  try {
    let workspaceId = ((req as any).workspaceId || req.headers['x-workspace-id'] || req.body?.workspaceId) as string;
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

    // Read current source records so Planner/task/preference edits are immediately
    // visible; a five-minute schedule snapshot hid changes even after refetch.
    const schedule = await buildFocusSchedule(userId, workspaceId, timerPrefs, req.headers['x-timezone'] as string | undefined, req.headers['x-timezone-offset'] as string | undefined);
    return res.json(schedule);
  } catch (error) {
    if ((error as Error).message?.startsWith('Invalid ')) return res.status(400).json({ message: (error as Error).message });
    console.error('Error fetching focus schedule:', error);
    return res.status(500).json({ message: 'Failed to build focus schedule' });
  }
};

export const getWallpaper = async (req: Request, res: Response) => {
  try {
    const rawCategory = typeof req.query.category === 'string' ? req.query.category.toLowerCase().trim() : 'nature';
    const ALLOWED_CATEGORIES = ['nature', 'minimal', 'space', 'abstract', 'dark', 'city'];
    const category = ALLOWED_CATEGORIES.includes(rawCategory) ? rawCategory : 'nature';
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
