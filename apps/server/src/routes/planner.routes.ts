import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { calculateCapacity } from '../services/capacity.service';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = Router();
router.use(requireAuth);

function getUserId(req: Request): string {
  return (req as any).user?.id;
}

function getWorkspaceId(req: Request): string {
  return (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || '';
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function createDateTime(date: Date, time: string) {
  const parts = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
  return result;
}

// GET /week?start=2026-08-24&end=2026-08-30
router.get('/week', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const start = z.coerce.date().parse(req.query.start);
    const end = z.coerce.date().parse(req.query.end);
    const weekStart = startOfDay(start);
    const weekEnd = endOfDay(end);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { weeklyCapacityMinutes: true, countryCode: true, regionCode: true },
    });

    const [
      habits,
      habitCompletions,
      tasks,
      timeBlocks,
      projects,
      milestones,
      syncRecord,
    ] = await Promise.all([
      prisma.habit.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      prisma.habitCompletion.findMany({
        where: { userId, completedAt: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { scheduledDate: { gte: weekStart, lte: weekEnd } },
            { dueDate: { gte: weekStart, lte: weekEnd } },
          ],
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.timeBlock.findMany({
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.project.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      prisma.milestone.findMany({
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
      }),

      prisma.externalItem.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const capacity = calculateCapacity(
      user.weeklyCapacityMinutes,
      timeBlocks
    );

    const routines = habits.filter((h: any) => h.pinnedToPlanner).map(h => ({
      id: h.id,
      name: h.name,
    }));

    // Generate dynamic occurrences based on scheduled days
    const occurrences: any[] = [];
    let currentDay = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = currentDay.getDay(); // 0 = Sun, 1 = Mon, etc.
      const dateStr = currentDay.toISOString().split('T')[0] as string;

      for (const habit of habits) {
        if (habit.scheduledDays && habit.scheduledDays.includes(dayOfWeek)) {
          const completion = habitCompletions.find(c =>
            c.habitId === habit.id && c.completedAt.toISOString().startsWith(dateStr)
          );

          occurrences.push({
            id: completion ? completion.id : `${habit.id}-${dateStr}`,
            habitId: habit.id,
            date: currentDay.toISOString(),
            completed: !!completion,
            completedAt: completion ? completion.completedAt.toISOString() : null,
            isVirtual: !completion
          });
        }
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const plannerTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      completed: t.status === 'DONE',
      scheduledDate: t.scheduledDate?.toISOString() || null,
      dueDate: t.dueDate?.toISOString() || null,
      estimateMinutes: t.estimateMinutes,
    }));

    const plannerProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
    }));

    return res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      config: {
        countryCode: user.countryCode || 'IN',
        regionCode: user.regionCode,
      },
      routines,
      occurrences,
      tasks: plannerTasks,
      timeBlocks,
      projects: plannerProjects,
      milestones,
      capacity,
      syncStatus: syncRecord
        ? {
            provider: syncRecord.provider,
            status: syncRecord.syncStatus,
            lastSyncedAt: syncRecord.updatedAt?.toISOString() || null,
          }
        : null,
    });
  } catch (error) {
    console.error('Planner week error:', error);
    return res.status(500).json({ code: 'PLANNER_WEEK_FAILED', message: 'Unable to load Planner' });
  }
});

const timeBlockSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.enum(['MEETING', 'PERSONAL', 'STUDY', 'WORK', 'HEALTH', 'ADMIN', 'OTHER']),
  taskId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

router.post('/time-blocks', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const body = timeBlockSchema.parse(req.body);
    const startTime = createDateTime(body.date, body.startTime);
    const endTime = createDateTime(body.date, body.endTime);

    if (endTime <= startTime) {
      return res.status(400).json({ code: 'INVALID_TIME_RANGE', message: 'End time must be after start time' });
    }

    // Server-side overlap check
    const overlapping = await prisma.timeBlock.findFirst({
      where: {
        userId,
        date: body.date,
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });
    if (overlapping) {
      return res.status(409).json({ message: "Time block overlaps with an existing block on this date" });
    }

    const timeBlock = await prisma.timeBlock.create({
      data: {
        userId,
        title: body.title,
        date: body.date,
        startTime,
        endTime,
        type: body.type as any,
        taskId: body.taskId,
        projectId: body.projectId,
        notes: body.notes,
        syncStatus: 'SYNC_PENDING',
      },
    });

    return res.status(201).json(timeBlock);
  } catch (error) {
    console.error('Create time block:', error);
    return res.status(400).json({ code: 'TIME_BLOCK_CREATE_FAILED', message: 'Unable to create time block' });
  }
});

router.patch('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await prisma.timeBlock.findFirst({
      where: { id: req.params.id as string, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Time block not found' });
    }

    const body = timeBlockSchema.partial().parse(req.body);
    const date = body.date ?? existing.date;

    const startTime = body.startTime
      ? createDateTime(date, body.startTime)
      : existing.startTime;

    const endTime = body.endTime
      ? createDateTime(date, body.endTime)
      : existing.endTime;

    if (endTime <= startTime) {
      return res.status(400).json({ code: 'INVALID_TIME_RANGE', message: 'End time must be after start time' });
    }

    // Server-side overlap check for patch
    const overlapping = await prisma.timeBlock.findFirst({
      where: {
        userId,
        date,
        id: { not: existing.id },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });
    if (overlapping) {
      return res.status(409).json({ message: "Time block overlaps with an existing block on this date" });
    }

    const updated = await prisma.timeBlock.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        date,
        startTime,
        endTime,
        type: body.type as any,
        taskId: body.taskId,
        projectId: body.projectId,
        notes: body.notes,
        syncStatus: 'SYNC_PENDING',
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update time block:', error);
    return res.status(400).json({ code: 'TIME_BLOCK_UPDATE_FAILED', message: 'Unable to update time block' });
  }
});

router.delete('/time-blocks/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const block = await prisma.timeBlock.findFirst({
      where: { id: req.params.id as string, userId },
    });

    if (!block) {
      return res.status(404).json({ message: 'Time block not found' });
    }

    await prisma.timeBlock.delete({ where: { id: block.id } });
    return res.status(204).send();
  } catch (error) {
    console.error('Delete time block:', error);
    return res.status(500).json({ message: 'Unable to delete time block' });
  }
});

router.patch('/routine-occurrences', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const body = z.object({
      id: z.string(),
      habitId: z.string(),
      date: z.string(),
      completed: z.boolean(),
      isVirtual: z.boolean().optional(),
    }).parse(req.body);

    const dateStr = body.date.split('T')[0];
    const completedAt = createDateTime(new Date(body.date), "00:00");

    if (body.completed) {
      // Create completion if it doesn't exist
      const existing = await prisma.habitCompletion.findFirst({
        where: { userId, habitId: body.habitId, completedAt: { gte: new Date(`${dateStr}T00:00:00.000Z`), lte: new Date(`${dateStr}T23:59:59.999Z`) } }
      });
      if (!existing) {
        await prisma.habitCompletion.create({
          data: {
            userId,
            habitId: body.habitId,
            completedAt: new Date(),
          }
        });
      }
    } else {
      // Delete completions for that day
      await prisma.habitCompletion.deleteMany({
        where: {
          userId,
          habitId: body.habitId,
          completedAt: { gte: new Date(`${dateStr}T00:00:00.000Z`), lte: new Date(`${dateStr}T23:59:59.999Z`) }
        }
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Routine update:', error);
    return res.status(400).json({ message: 'Unable to update routine' });
  }
});

export default router;
