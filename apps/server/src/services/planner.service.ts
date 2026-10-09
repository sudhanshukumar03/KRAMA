import { HolidaySyncService } from '../services/holidays/HolidaySyncService';
import { prisma, type TxClient } from '../prisma';
import { calculateCapacity } from '../services/capacity.service';
import { habitService } from '../services/habit.service';
import { socketService } from '../services/socket.service';
import {
  TimeBlockSchema,
  TimeBlockUpdateSchema,
  MilestoneSchema,
  MilestoneUpdateSchema,
  RoutineOccurrenceSchema,
  WeekQuerySchema,
} from '@krama/validation';
import {
  canonicalDay,
  createDateTime,
  toHHmm,
  isCapacityHoliday,
} from '../services/plannerTime';


export interface PlannerContext { userId: string; workspaceId: string; id?: string; }
export class PlannerError extends Error {
  constructor(public readonly statusCode: number, public readonly payload: { message: string; code?: string }) {
    super(payload.message);
  }
}
const holidaySync = new HolidaySyncService();
async function resolveWorkspace({ userId, workspaceId }: PlannerContext): Promise<string> {
  if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });
  const member = workspaceId
    ? await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, select: { workspaceId: true } })
    : await prisma.workspaceMember.findFirst({ where: { userId }, select: { workspaceId: true } });
  if (workspaceId && !member) throw new PlannerError(403, { message: 'Forbidden: Not a member of this workspace' });
  if (!member) throw new PlannerError(400, { message: 'workspaceId is required' });
  return member.workspaceId;
}

function isWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && error.code === 'P2034') return true;
  return 'name' in error && error.name === 'DriverAdapterError' &&
    'cause' in error && !!error.cause && typeof error.cause === 'object' &&
    'kind' in error.cause && error.cause.kind === 'TransactionWriteConflict';
}

async function writePlannerBlock<T>(write: (tx: TxClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(write, { isolationLevel: 'Serializable' });
    } catch (error) {
      // Query conflicts are P2034; adapter commit conflicts retain their cause.
      if (!isWriteConflict(error)) throw error;
      if (attempt >= 2) {
        throw new PlannerError(409, { code: 'PLANNER_WRITE_CONFLICT', message: 'Planner changed concurrently. Please retry your edit.' });
      }
    }
  }
}
// Soft-IDOR guard: a block may link a task and/or project, but the caller must
// not be able to attach one that lives in another workspace. Verifies each
// supplied id belongs to the block's workspace before it is saved. An empty
// `workspaceId` (membership-less local user) can't be scoped, so it is skipped.
async function verifyBlockLinks(
  workspaceId: string,
  taskId: string | null,
  projectId: string | null,
  db: TxClient = prisma
): Promise<{ ok: true } | { status: number; message: string }> {
  if (taskId) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { workspaceId: true, deletedAt: true },
    });
    if (!task || task.deletedAt) return { status: 404, message: 'Linked task not found' };
    if (workspaceId && task.workspaceId !== workspaceId) {
      return { status: 403, message: 'Forbidden: task belongs to another workspace' };
    }
  }
  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, deletedAt: true },
    });
    if (!project || project.deletedAt) return { status: 404, message: 'Linked project not found' };
    if (workspaceId && project.workspaceId !== workspaceId) {
      return { status: 403, message: 'Forbidden: project belongs to another workspace' };
    }
  }
  return { ok: true };
}


async function getWeek(context: PlannerContext, query: ReturnType<typeof WeekQuerySchema.parse>) {
    const userId = context.userId;
    const workspaceId = await resolveWorkspace(context);

    const { start: startParam, end: endParam } = query;

    const weekStart = new Date(`${startParam}T00:00:00.000Z`);
    const weekEnd = new Date(`${endParam}T23:59:59.999Z`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyCapacityMinutes: true, countryCode: true, regionCode: true },
    });
    if (!user) throw new PlannerError(401, { message: 'User not found' });

    const [
      habits,
      habitCompletions,
      tasks,
      timeBlocks,
      projects,
      milestones,
      holidayData,
      goalDeadlinesRaw,
    ] = await Promise.all([
      prisma.habit.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      prisma.habitCompletion.findMany({
        // Match on the canonical `date` column (UTC-noon per day), which is what
        // the occurrence lookup below compares against — not `completedAt` (the
        // wall-clock time the completion was recorded, which can fall in another week).
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          status: { not: 'CANCELED' }, // canceled tasks must not surface in the planner week/matrix
          OR: [
            { scheduledDate: { gte: weekStart, lte: weekEnd } },
            { dueDate: { gte: weekStart, lte: weekEnd } },
            // Genuinely-unscheduled backlog only (no scheduled date AND no due
            // date). A task with a due date outside this week renders nowhere,
            // so pulling it here was wasted work — matches `unscheduledTasks`.
            { scheduledDate: null, dueDate: null, status: { not: 'DONE' } },
          ],
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
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
        // Scope to milestones whose project lives in the current workspace so a
        // user's milestones from other workspaces don't bleed into this view.
        where: { userId, date: { gte: weekStart, lte: weekEnd }, project: { workspaceId, deletedAt: null } },
      }),
      // Sync national holidays (regionCode null) plus, when the user has a
      // region set, that region's holidays. The provider partitions the two so
      // rows are never duplicated. Cover every year the week spans (year-boundary
      // weeks touch two years).
      (async () => {
        const cc = user.countryCode || 'IN';
        const rc = user.regionCode || null;
        const years = [...new Set([weekStart.getUTCFullYear(), weekEnd.getUTCFullYear()])];
        const perYear = await Promise.all(years.map(year => holidaySync.getCalendar({ countryCode: cc, regionCode: rc, year })));
        return {
          holidays: perYear.flatMap(group => group.holidays),
          coverage: {
            missingNationalYears: perYear.flatMap(group => group.missingNationalYears),
            missingRegionalYears: perYear.flatMap(group => group.missingRegionalYears),
          },
        };
      })(),
      // Goals with a target date inside the week — surfaced as deadline chips in the
      // planner views. Workspace-scoped; no schema change (goals already carry
      // targetDate + workspaceId).
      prisma.goal.findMany({
        where: { workspaceId, deletedAt: null, targetDate: { gte: weekStart, lte: weekEnd } },
        select: { id: true, title: true, targetDate: true, progress: true, icon: true },
      }),
    ]);

    const goalDeadlines = (goalDeadlinesRaw || []).map((g) => ({
      id: g.id,
      title: g.title,
      targetDate: g.targetDate,
      progress: g.progress,
      icon: g.icon,
    }));

    const workDayMinutes = Math.round((user.weeklyCapacityMinutes ?? 2400) / 5);

    const holidayBlocks = holidayData.holidays.filter((h) => {
      const hDate = new Date(h.date);
      return hDate >= weekStart && hDate <= weekEnd;
    }).map((h) => {
      const hDate = new Date(h.date);
      const startTime = new Date(hDate.getTime() + 1000 * 60 * 60 * 9); // 9:00 AM start
      const endTime = new Date(startTime.getTime() + workDayMinutes * 60 * 1000); // full configured working day
      return {
        // Include the date so two holidays sharing a name (e.g. a national and
        // a regional holiday, or the same name on different days) don't collide
        // on a single React key / block id.
        id: 'holiday-' + (hDate.toISOString().split('T')[0]) + '-' + h.name,
        title: h.name,
        date: hDate,
        startTime,
        endTime,
        type: 'OTHER',
        isExternal: true,
        isPublicHoliday: h.isPublicHoliday,
        isOptional: h.isOptional,
        source: 'Holiday'
      };
    });

    const allTimeBlocks = [...timeBlocks, ...holidayBlocks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Capacity is a 5-day (Mon–Fri) work-week model, so only weekday holidays
    // reduce it — a holiday that lands on a Saturday/Sunday deducts nothing.
    // Weekend holidays still appear as blocks in the payload (for display); they
    // just don't feed the capacity calculation.
    const capacityHolidayBlocks = holidayBlocks.filter((h) => isCapacityHoliday({ ...h, date: new Date(h.date) }));

    const capacity = calculateCapacity(
      user.weeklyCapacityMinutes ?? 2400,
      [...timeBlocks, ...capacityHolidayBlocks]
    );

    const habitsWithPinned = habits.map((h) => ({
      ...h,
      pinnedToPlanner: Boolean(h.metadata && typeof h.metadata === 'object' && !Array.isArray(h.metadata) && h.metadata.pinnedToPlanner),
    }));

    const routines = habitsWithPinned.filter((h) => h.pinnedToPlanner).map((h) => ({
      id: h.id,
      name: h.name,
    }));

    const plannerProjects = projects.map((p) => ({
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

      const dayOccurrences: { id: string; habitId: string; date: string; completed: boolean; completedAt: string | null; isVirtual: boolean }[] = [];
      for (const habit of habitsWithPinned) {
        const isScheduled = habit.scheduledDays && habit.scheduledDays.includes(dayOfWeek);
        const isPinned = habit.pinnedToPlanner;

        if (isScheduled || isPinned) {
          // Look up against the canonical date column
          const targetDateStr = `${dateStr}T12:00:00.000Z`;
          const completion = habitCompletions.find((c) =>
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

      const dayTasks = tasks.filter((t) => {
        const d = t.scheduledDate || t.dueDate;
        if (!d) return false;
        const dObj = d instanceof Date ? d : new Date(d);
        return !isNaN(dObj.getTime()) && dObj.toISOString().startsWith(dateStr);
      }).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        completed: t.status === 'DONE',
        scheduledDate: t.scheduledDate ? (t.scheduledDate instanceof Date ? t.scheduledDate.toISOString() : new Date(t.scheduledDate).toISOString()) : null,
        dueDate: t.dueDate ? (t.dueDate instanceof Date ? t.dueDate.toISOString() : new Date(t.dueDate).toISOString()) : null,
        estimateMinutes: t.estimateMinutes,
        priority: t.priority,
        project: t.project,
      }));

      const dayBlocks = allTimeBlocks.filter((b) => {
        const d = b.date instanceof Date ? b.date : new Date(b.date);
        return !isNaN(d.getTime()) && d.toISOString().startsWith(dateStr);
      });
      const dayMilestones = milestones.filter((m) => {
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
        goalDeadlines: goalDeadlines.filter((g) => (g.targetDate ? new Date(g.targetDate).toISOString().startsWith(dateStr) : false)),
      });

      currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }

    const unscheduledTasks = tasks.filter((t) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELED').map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      completed: t.status === 'DONE',
      scheduledDate: null,
      dueDate: null,
      estimateMinutes: t.estimateMinutes,
      priority: t.priority,
      project: t.project,
    }));

    const allOccurrences = days.flatMap(d => d.occurrences);
    const allMappedTasks = [...days.flatMap(d => d.tasks), ...unscheduledTasks];

    // Real weekly task-completion: how many of this week's scheduled tasks are
    // done. Distinct from capacity.completionPercent, which is capacity
    // utilization (occupied / weekly capacity) and duplicates the "Planned" tile.
    const scheduledThisWeek = days.flatMap(d => d.tasks);
    const completedThisWeek = scheduledThisWeek.filter((t) => t.status === 'DONE');
    const taskCompletionPercent = scheduledThisWeek.length === 0
      ? 0
      : Math.round((completedThisWeek.length / scheduledThisWeek.length) * 100);

    return ({
      holidayCoverage: holidayData.coverage,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      config: {
        countryCode: user.countryCode || 'IN',
        regionCode: user.regionCode,
      },
      days,
      routines,
      projects: plannerProjects,
      capacity: {
        ...capacity,
        taskCompletionPercent,
        completedTaskCount: completedThisWeek.length,
        scheduledTaskCount: scheduledThisWeek.length,
      },
      tasks: allMappedTasks,
      timeBlocks: allTimeBlocks,
      milestones,
      goalDeadlines,
      occurrences: allOccurrences,
      backlog: unscheduledTasks,
      workDayMinutes,
    });
}

async function createTimeBlock(context: PlannerContext, body: ReturnType<typeof TimeBlockSchema.parse>) {
    const userId = context.userId;
    const workspaceId = await resolveWorkspace(context);
    // Anchor the stored day at UTC noon so it buckets consistently across
    // timezones and the same-day overlap check compares like-for-like.
    const blockDate = canonicalDay(body.date);
    const startTime = createDateTime(blockDate, body.startTime);
    const endTime = createDateTime(blockDate, body.endTime);

    if (endTime <= startTime) {
      throw new PlannerError(400, { code: 'INVALID_TIME_RANGE', message: 'End time must be after start time' });
    }

    const taskId = body.taskId || null;
    const projectId = body.projectId || null;
    const links = await verifyBlockLinks(workspaceId, taskId, projectId);
    if ('status' in links) {
      throw new PlannerError(links.status, { message: links.message });
    }

    // Wrap the overlap check + create in a serializable transaction and re-check
    // inside it, so two concurrent creates can't both pass the check and land
    // overlapping blocks (TOCTOU race).
    const result = await writePlannerBlock(async (tx) => {
      const overlapping = await tx.timeBlock.findFirst({
        where: {
          userId,
          ...(workspaceId ? { workspaceId } : {}),
          date: blockDate,
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } },
          ],
        },
      });
      if (overlapping) return { conflict: true as const };

      const created = await tx.timeBlock.create({
        data: {
          userId,
          workspaceId: workspaceId || null,
          title: body.title,
          date: blockDate,
          startTime,
          endTime,
          type: body.type,
          taskId,
          projectId,
          notes: body.notes,
        },
      });
      return { conflict: false as const, block: created };
    });

    if (result.conflict) {
      throw new PlannerError(409, { message: "Time block overlaps with an existing block on this date" });
    }

    socketService.emitToUser(userId, 'planner:changed', { workspaceId });
    return (result.block);
}

async function updateTimeBlock(context: PlannerContext, body: ReturnType<typeof TimeBlockUpdateSchema.parse>) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });
    const workspaceId = context.workspaceId;

    // Read omitted fields in the same serializable transaction as the write.
    // A retried partial edit must merge against the latest committed block.
    const result = await writePlannerBlock(async (tx) => {
      const existing = await tx.timeBlock.findFirst({
        where: { id: context.id!, userId, ...(workspaceId ? { workspaceId } : {}) },
      });

      if (!existing) {
        throw new PlannerError(404, { message: 'Time block not found' });
      }
      if (existing.workspaceId) {
        const member = await tx.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId, workspaceId: existing.workspaceId } }, select: { id: true },
        });
        if (!member) throw new PlannerError(403, { message: 'Forbidden' });
      }


      // Always rebuild both instants against the effective (canonical) day. A
      // date-only move (drag to another day) must carry the block's existing
      // wall-clock times over to the new day — deriving HH:mm from the stored
      // instants when the body omits them — otherwise the block keeps the old
      // day's start/end (the move-block bug).
      const date = canonicalDay(body.date ?? existing.date);
      const startTime = createDateTime(date, body.startTime ?? toHHmm(existing.startTime));
      const endTime = createDateTime(date, body.endTime ?? toHHmm(existing.endTime));

      if (endTime <= startTime) {
        throw new PlannerError(400, { code: 'INVALID_TIME_RANGE', message: 'End time must be after start time' });
      }

      // Coerce empty-string links to null (clear); leave undefined untouched.
      const taskId = body.taskId === undefined ? undefined : (body.taskId || null);
      const projectId = body.projectId === undefined ? undefined : (body.projectId || null);
      // Verify links against the block's workspace, falling back to the caller's
      // workspace context. Using `existing.workspaceId || ''` alone let a
      // null-workspace block be re-linked to a task/project in another workspace
      // (the verification is skipped for an empty workspace id) — a soft IDOR.
      const fallbackMember = !existing.workspaceId && !workspaceId ? await tx.workspaceMember.findFirst({ where: { userId }, select: { workspaceId: true } }) : null;
      const linkWorkspaceId = existing.workspaceId || workspaceId || fallbackMember?.workspaceId || '';
      if (!linkWorkspaceId && (taskId || projectId)) throw new PlannerError(403, { message: 'Workspace access required for linked items' });
      const links = await verifyBlockLinks(linkWorkspaceId, taskId ?? null, projectId ?? null, tx);
      if ('status' in links) {
        throw new PlannerError(links.status, { message: links.message });
      }

      // Serializable transaction: re-check overlap inside so a concurrent write
      // can't slip an overlapping block past the check (TOCTOU race).
      const overlapping = await tx.timeBlock.findFirst({
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
      if (overlapping) return { conflict: true as const };

      const block = await tx.timeBlock.update({
        where: { id: existing.id },
        data: {
          title: body.title,
          date,
          startTime,
          endTime,
          type: body.type,
          taskId,
          projectId,
          notes: body.notes,
        },
      });
      return { conflict: false as const, block };
    });

    if (result.conflict) {
      throw new PlannerError(409, { message: "Time block overlaps with an existing block on this date" });
    }

    socketService.emitToUser(userId, 'planner:changed', { workspaceId: result.block.workspaceId });
    return (result.block);
}

async function deleteTimeBlock(context: PlannerContext) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });
    const workspaceId = context.workspaceId;

    const block = await prisma.timeBlock.findFirst({
      where: { id: context.id!, userId, ...(workspaceId ? { workspaceId } : {}) },
    });

    if (!block) {
      throw new PlannerError(404, { message: 'Time block not found' });
    }
    if (block.workspaceId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: block.workspaceId } }, select: { id: true },
      });
      if (!member) throw new PlannerError(403, { message: 'Forbidden' });
    }


    await prisma.timeBlock.delete({ where: { id: block.id } });
    socketService.emitToUser(userId, 'planner:changed', { workspaceId: block.workspaceId });
    return;
}

async function updateRoutineOccurrence(context: PlannerContext, body: ReturnType<typeof RoutineOccurrenceSchema.parse>) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });
    let workspaceId = context.workspaceId;


    // `date` is coerced to a Date; re-anchor at UTC noon for the day key.
    const dateStr = body.date.toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T12:00:00.000Z`);

    // Resolve the habit and enforce workspace membership before mutating it.
    // Never trust a workspace derived solely from the target habit — verify the
    // caller actually belongs to that workspace (prevents cross-workspace IDOR).
    const habit = await prisma.habit.findUnique({
      where: { id: body.habitId },
      select: { workspaceId: true },
    });
    if (!habit) throw new PlannerError(404, { message: 'Habit not found' });
    if (workspaceId && workspaceId !== habit.workspaceId) {
      throw new PlannerError(403, { message: 'Forbidden' });
    }
    workspaceId = habit.workspaceId;

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });
    if (!membership) throw new PlannerError(403, { message: 'Forbidden' });

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

    return ({ success: true });
}

async function listMilestones(context: PlannerContext, query: ReturnType<typeof WeekQuerySchema.parse>) {
    const userId = context.userId;
    const workspaceId = await resolveWorkspace(context);

    const { start: startParam, end: endParam } = query;
    const rangeStart = new Date(`${startParam}T00:00:00.000Z`);
    const rangeEnd = new Date(`${endParam}T23:59:59.999Z`);

    const milestones = await prisma.milestone.findMany({
      where: { userId, date: { gte: rangeStart, lte: rangeEnd }, project: { workspaceId, deletedAt: null } },
    });

    // Sibling to /week's goalDeadlines: goals whose targetDate falls in range,
    // for callers that fetch milestones for a wider window (e.g. month view).
    const goals = await prisma.goal.findMany({
      where: { workspaceId, deletedAt: null, targetDate: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, title: true, targetDate: true, progress: true, icon: true },
    });

    return ({ milestones, goalDeadlines: goals });
}

async function createMilestone(context: PlannerContext, body: ReturnType<typeof MilestoneSchema.parse>) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });

    const date = canonicalDay(body.date);

    // Verify the target project exists and the caller is a member of its workspace
    // before attaching a milestone to it.
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { workspaceId: true, deletedAt: true },
    });
    if (!project || project.deletedAt) throw new PlannerError(404, { message: 'Project not found' });
    if (context.workspaceId && context.workspaceId !== project.workspaceId) throw new PlannerError(403, { message: 'Project belongs to another workspace' });
    const projectMembership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
      select: { id: true },
    });
    if (!projectMembership) throw new PlannerError(403, { message: 'Forbidden' });

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        title: body.title,
        date: date,
        projectId: body.projectId,
      },
    });

    return (milestone);
}

async function updateMilestone(context: PlannerContext, body: ReturnType<typeof MilestoneUpdateSchema.parse>) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });

    const existing = await prisma.milestone.findFirst({
      where: { id: context.id!, userId, project: { deletedAt: null } },
      include: { project: { select: { workspaceId: true } } },
    });
    if (!existing) throw new PlannerError(404, { message: 'Milestone not found' });
    if (context.workspaceId && existing.project.workspaceId !== context.workspaceId) throw new PlannerError(404, { message: 'Milestone not found' });
    const sourceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: existing.project.workspaceId } }, select: { id: true },
    });
    if (!sourceMember) throw new PlannerError(403, { message: 'Forbidden' });


    const dataToUpdate = { ...body };
    if (body.date) {
      dataToUpdate.date = canonicalDay(body.date);
    }

    // If the milestone is being re-parented, verify the target project exists
    // and the caller is a member of its workspace (same guard as create).
    if (body.projectId && body.projectId !== existing.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: body.projectId },
        select: { workspaceId: true, deletedAt: true },
      });
      if (!project || project.deletedAt) throw new PlannerError(404, { message: 'Project not found' });
    if (context.workspaceId && context.workspaceId !== project.workspaceId) throw new PlannerError(403, { message: 'Project belongs to another workspace' });
      const projectMembership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
        select: { id: true },
      });
      if (!projectMembership) throw new PlannerError(403, { message: 'Forbidden' });
    }

    const milestone = await prisma.milestone.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    return (milestone);
}

async function deleteMilestone(context: PlannerContext) {
    const userId = context.userId;
    if (!userId) throw new PlannerError(401, { message: 'Unauthorized' });

    const existing = await prisma.milestone.findFirst({
      where: { id: context.id!, userId, project: { deletedAt: null } },
      include: { project: { select: { workspaceId: true } } },
    });
    if (!existing) throw new PlannerError(404, { message: 'Milestone not found' });
    if (context.workspaceId && existing.project.workspaceId !== context.workspaceId) throw new PlannerError(404, { message: 'Milestone not found' });
    const sourceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: existing.project.workspaceId } }, select: { id: true },
    });
    if (!sourceMember) throw new PlannerError(403, { message: 'Forbidden' });


    await prisma.milestone.delete({
      where: { id: existing.id },
    });

    return ({ success: true });
}

async function hasWorkspaceAccess(userId: string, workspaceId: string) {
  return !!await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, select: { id: true } });
}

export const plannerService = { getWeek, createTimeBlock, updateTimeBlock, deleteTimeBlock, updateRoutineOccurrence, listMilestones, createMilestone, updateMilestone, deleteMilestone, hasWorkspaceAccess };
