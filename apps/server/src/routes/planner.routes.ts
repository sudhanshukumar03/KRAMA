import { HolidaySyncService } from '../services/holidays/HolidaySyncService';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { calculateCapacity } from '../services/capacity.service';
import { habitService } from '../services/habit.service';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = Router();
const holidaySync = new HolidaySyncService();
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
    let workspaceId = getWorkspaceId(req);

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (workspaceId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (!member) {
        return res.status(403).json({ message: 'Forbidden: Not a member of this workspace' });
      }
    } else {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      if (member) {
        workspaceId = member.workspaceId;
      }
    }
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const startParam = (req.query.start as string) || '';
    const endParam = (req.query.end as string) || '';
    if (!startParam || !endParam) {
      return res.status(400).json({ message: 'start and end date query params are required' });
    }

    const weekStart = new Date(`${startParam}T00:00:00.000Z`);
    const weekEnd = new Date(`${endParam}T23:59:59.999Z`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyCapacityMinutes: true, countryCode: true, regionCode: true },
    });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const [
      habits,
      habitCompletions,
      tasks,
      timeBlocks,
      projects,
      milestones,
      holidaysList,
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
            { scheduledDate: null, status: { not: 'DONE' } },
          ],
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.timeBlock.findMany({
        where: { userId, workspaceId, date: { gte: weekStart, lte: weekEnd } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.project.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      prisma.milestone.findMany({
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
      }),
      holidaySync.ensureHolidays({ countryCode: user.countryCode || 'IN', regionCode: user.regionCode || null, year: weekStart.getFullYear() }),
    ]);

    const workDayMinutes = Math.round((user.weeklyCapacityMinutes ?? 2400) / 5);

    const holidayBlocks = (holidaysList || []).filter((h: any) => {
      const hDate = new Date(h.date);
      return hDate >= weekStart && hDate <= weekEnd;
    }).map((h: any) => {
      const hDate = new Date(h.date);
      const startTime = new Date(hDate.getTime() + 1000 * 60 * 60 * 9); // 9:00 AM start
      const endTime = new Date(startTime.getTime() + workDayMinutes * 60 * 1000); // full configured working day
      return {
        id: 'holiday-' + h.name,
        title: h.name,
        date: hDate,
        startTime,
        endTime,
        type: 'OTHER',
        isExternal: true,
        source: 'Holiday'
      };
    });

    const allTimeBlocks = [...timeBlocks, ...holidayBlocks].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const capacity = calculateCapacity(
      user.weeklyCapacityMinutes ?? 2400,
      allTimeBlocks
    );

    const habitsWithPinned = habits.map((h: any) => ({
      ...h,
      pinnedToPlanner: (h.metadata as any)?.pinnedToPlanner ?? false,
    }));

    const routines = habitsWithPinned.filter((h: any) => h.pinnedToPlanner).map((h: any) => ({
      id: h.id,
      name: h.name,
    }));

    const plannerProjects = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
    }));

    const days = [];
    let currentDay = new Date(weekStart);
    const startDateOnly = new Date(`${startParam}T00:00:00.000Z`);
    const endDateOnly = new Date(`${endParam}T00:00:00.000Z`);
    const dayCount = Math.max(1, Math.round((endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    for (let i = 0; i < Math.min(dayCount, 31); i++) {
      const dayOfWeek = currentDay.getUTCDay(); // 0 = Sun, 1 = Mon, etc.
      const dateStr = currentDay.toISOString().split('T')[0] as string;

      const dayOccurrences: any[] = [];
      for (const habit of habitsWithPinned) {
        const isScheduled = habit.scheduledDays && habit.scheduledDays.includes(dayOfWeek);
        const isPinned = habit.pinnedToPlanner;

        if (isScheduled || isPinned) {
          // Look up against the canonical date column
          const targetDateStr = `${dateStr}T12:00:00.000Z`;
          const completion = habitCompletions.find((c: any) =>
            c.habitId === habit.id && c.date && (c.date instanceof Date ? c.date.toISOString() : new Date(c.date).toISOString()) === targetDateStr
          );

          dayOccurrences.push({
            id: completion ? completion.id : `${habit.id}-${dateStr}`,
            habitId: habit.id,
            date: targetDateStr, // Always send the canonical UTC noon
            completed: !!completion,
            completedAt: completion?.completedAt ? (completion.completedAt instanceof Date ? completion.completedAt.toISOString() : new Date(completion.completedAt).toISOString()) : null,
            isVirtual: !completion
          });
        }
      }

      const dayTasks = tasks.filter((t: any) => {
        const d = t.scheduledDate || t.dueDate;
        if (!d) return false;
        const dObj = d instanceof Date ? d : new Date(d);
        return !isNaN(dObj.getTime()) && dObj.toISOString().startsWith(dateStr);
      }).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        completed: t.status === 'DONE',
        scheduledDate: t.scheduledDate ? (t.scheduledDate instanceof Date ? t.scheduledDate.toISOString() : new Date(t.scheduledDate).toISOString()) : null,
        dueDate: t.dueDate ? (t.dueDate instanceof Date ? t.dueDate.toISOString() : new Date(t.dueDate).toISOString()) : null,
        estimateMinutes: t.estimateMinutes,
      }));

      const dayBlocks = allTimeBlocks.filter((b: any) => {
        const d = b.date instanceof Date ? b.date : new Date(b.date);
        return !isNaN(d.getTime()) && d.toISOString().startsWith(dateStr);
      });
      const dayMilestones = milestones.filter((m: any) => {
        const d = m.date instanceof Date ? m.date : new Date(m.date);
        return !isNaN(d.getTime()) && d.toISOString().startsWith(dateStr);
      });

      days.push({
        dateKey: dateStr,
        date: currentDay.toISOString(),
        occurrences: dayOccurrences,
        tasks: dayTasks,
        timeBlocks: dayBlocks,
        milestones: dayMilestones,
      });

      currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }

    const unscheduledTasks = tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELED').map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      completed: t.status === 'DONE',
      scheduledDate: null,
      dueDate: null,
      estimateMinutes: t.estimateMinutes,
    }));

    const allOccurrences = days.flatMap(d => d.occurrences);
    const allMappedTasks = [...days.flatMap(d => d.tasks), ...unscheduledTasks];
    
    return res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      config: {
        countryCode: user.countryCode || 'IN',
        regionCode: user.regionCode,
      },
      routines,
      projects: plannerProjects,
      days,
      capacity,
      tasks: allMappedTasks,
      backlog: unscheduledTasks,
      workDayMinutes,
      timeBlocks: allTimeBlocks,
      milestones,
      occurrences: allOccurrences,
    });
  } catch (error: any) {
    console.error('Planner week error:', error);
    return res.status(500).json({ 
      code: 'PLANNER_WEEK_FAILED', 
      message: error?.message || 'Unable to load Planner' 
    });
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
    let workspaceId = getWorkspaceId(req);
    if (workspaceId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (!member) return res.status(403).json({ message: 'Forbidden: Not a member of this workspace' });
    } else {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      if (member) workspaceId = member.workspaceId;
    }

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
        ...(workspaceId ? { workspaceId } : {}),
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
        workspaceId,
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
    const workspaceId = getWorkspaceId(req);

    const existing = await prisma.timeBlock.findFirst({
      where: { id: req.params.id as string, userId, ...(workspaceId ? { workspaceId } : {}) },
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
        ...(existing.workspaceId ? { workspaceId: existing.workspaceId } : {}),
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
    const workspaceId = getWorkspaceId(req);

    const block = await prisma.timeBlock.findFirst({
      where: { id: req.params.id as string, userId, ...(workspaceId ? { workspaceId } : {}) },
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
    let workspaceId = getWorkspaceId(req);

    const body = z.object({
      id: z.string(),
      habitId: z.string(),
      date: z.string(),
      completed: z.boolean(),
      isVirtual: z.boolean().optional(),
    }).parse(req.body);

    const dateStr = body.date.split('T')[0];
    const targetDate = new Date(`${dateStr}T12:00:00.000Z`);

    if (!workspaceId) {
      const habit = await prisma.habit.findUnique({ where: { id: body.habitId } });
      if (habit) workspaceId = habit.workspaceId;
    }
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    if (body.completed) {
      await habitService.logHabitCompletion({
        id: body.habitId,
        userId,
        workspaceId,
        dateIso: targetDate.toISOString(),
      });
    } else {
      await habitService.unlogHabitCompletion({
        id: body.habitId,
        userId,
        workspaceId,
        dateIso: targetDate.toISOString(),
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Routine update:', error);
    return res.status(400).json({ message: error?.message || 'Unable to update routine' });
  }
});


// Milestones
router.post('/milestones', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const schema = z.object({
      title: z.string().min(1),
      date: z.coerce.date(),
      projectId: z.string().min(1),
    });
    
    const body = schema.parse(req.body);
    const date = startOfDay(body.date);

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        title: body.title,
        date: date,
        projectId: body.projectId,
      },
    });

    return res.json(milestone);
  } catch (error) {
    console.error('Create milestone:', error);
    return res.status(400).json({ message: 'Unable to create milestone' });
  }
});

router.patch('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await prisma.milestone.findFirst({
      where: { id: req.params.id as string, userId },
    });
    if (!existing) return res.status(404).json({ message: 'Milestone not found' });

    const schema = z.object({
      title: z.string().min(1).optional(),
      date: z.coerce.date().optional(),
      projectId: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    });
    
    const body = schema.parse(req.body);
    const dataToUpdate: any = { ...body };
    if (body.date) {
      dataToUpdate.date = startOfDay(body.date);
    }

    const milestone = await prisma.milestone.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    return res.json(milestone);
  } catch (error) {
    console.error('Update milestone:', error);
    return res.status(400).json({ message: 'Unable to update milestone' });
  }
});

router.delete('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await prisma.milestone.findFirst({
      where: { id: req.params.id as string, userId },
    });
    if (!existing) return res.status(404).json({ message: 'Milestone not found' });

    await prisma.milestone.delete({
      where: { id: existing.id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete milestone:', error);
    return res.status(400).json({ message: 'Unable to delete milestone' });
  }
});

export default router;



