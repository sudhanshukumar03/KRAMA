import { prisma } from '../prisma';
import { calculateHabitStats } from './habitStreak.service';
import { reportingClock, shiftDay } from './reportingTime';

export const analyticsService = {
  async getOverview(workspaceId: string, range: '7d' | '30d' | '90d', userId: string, timeZone?: string, offset?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
    const clock = reportingClock(user, timeZone, offset);
    const today = clock.dateKey(new Date());
    const startKey = shiftDay(today, -(Number(range.slice(0, -1)) - 1));
    const start = clock.dayStart(shiftDay(startKey, -6));
    const end = clock.dayStart(shiftDay(today, 1));
    const [tasks, sessions, logs, habits, goalStats] = await Promise.all([
      prisma.task.findMany({ where: { workspaceId, status: 'DONE', deletedAt: null, updatedAt: { gte: start } }, select: { id: true, metadata: true, updatedAt: true } }),
      prisma.focusSession.findMany({ where: { workspaceId, userId, completed: true, type: { in: ['pomodoro', 'custom'] }, startTime: { gte: start, lt: end } }, select: { duration: true, startTime: true } }),
      prisma.dailyLog.findMany({ where: { workspaceId, userId, deletedAt: null, date: { gte: new Date(`${startKey}T00:00:00.000Z`), lt: new Date(`${shiftDay(today, 1)}T00:00:00.000Z`) } }, select: { date: true, deepWorkMinutes: true } }),
      prisma.habit.findMany({ where: { workspaceId, deletedAt: null }, select: { createdAt: true, scheduledDays: true, cadence: true, metadata: true, completions: { where: { userId, date: { lt: new Date(`${shiftDay(today, 1)}T00:00:00.000Z`) } }, select: { date: true, offSchedule: true } } } }),
      prisma.goal.aggregate({ where: { workspaceId, deletedAt: null, parentGoalId: null }, _avg: { progress: true }, _count: true }),
    ]);
    const completedDates = tasks.map(task => {
      const stored = (task.metadata as any)?.completedAt;
      const date = typeof stored === 'string' && !Number.isNaN(Date.parse(stored)) ? new Date(stored) : task.updatedAt;
      return clock.dateKey(date);
    });
    const focusByDay = new Map<string, number>();
    for (const session of sessions) {
      const key = clock.dateKey(session.startTime);
      focusByDay.set(key, (focusByDay.get(key) || 0) + session.duration);
    }
    const logsByDay = new Map(logs.map(log => [log.date.toISOString().slice(0, 10), log.deepWorkMinutes ?? null]));
    return Array.from({ length: Number(range.slice(0, -1)) }, (_, index) => {
      const key = shiftDay(startKey, index);
      const reference = new Date(`${key}T12:00:00.000Z`);
      const activeStreaks = habits.filter(habit => clock.dateKey(habit.createdAt) <= key && calculateHabitStats({ ...habit, completions: habit.completions.filter(c => c.date.toISOString().slice(0, 10) <= key) }, reference, 'UTC').current > 0).length;
      const from = shiftDay(key, -6);
      return {
        date: `${key}T12:00:00.000Z`, dayKey: key,
        weeklyVelocity: completedDates.filter(day => day >= from && day <= key).length,
        completedTasks: completedDates.filter(day => day === key).length,
        activeStreaks,
        okrPace: key === today && goalStats._count ? Math.round(goalStats._avg.progress || 0) : null,
        goalCount: key === today ? goalStats._count : null,
        deepWorkLogged: (focusByDay.get(key) || 0) / 60,
        loggedDeepWork: logsByDay.get(key) ?? null,
      };
    });
  },

  async getFocusHistory(workspaceId: string, range: '7d' | '30d' | '90d', userId: string, timeZone?: string, offset?: string, cursor?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
    const clock = reportingClock(user, timeZone, offset);
    const today = clock.dateKey(new Date());
    const startKey = shiftDay(today, -(Number(range.slice(0, -1)) - 1));
    const where = { workspaceId, userId, startTime: { gte: clock.dayStart(startKey), lt: clock.dayStart(shiftDay(today, 1)) } };
    const after = cursor ? await prisma.focusSession.findFirst({ where: { ...where, id: cursor }, select: { id: true, startTime: true } }) : null;
    if (cursor && !after) throw new Error('Invalid history cursor');
    const [rows, total] = await Promise.all([
      prisma.focusSession.findMany({
        where: { ...where, ...(after ? { OR: [{ startTime: { lt: after.startTime } }, { startTime: after.startTime, id: { lt: after.id } }] } : {}) },
        include: { task: { select: { id: true, title: true, workspaceId: true, deletedAt: true } }, project: { select: { id: true, name: true, workspaceId: true, deletedAt: true } } },
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }], take: 21,
      }),
      prisma.focusSession.count({ where }),
    ]);
    const sessions = rows.slice(0, 20).map(row => ({ ...row, task: row.task?.workspaceId === workspaceId && !row.task.deletedAt ? { id: row.task.id, title: row.task.title } : null, project: row.project?.workspaceId === workspaceId && !row.project.deletedAt ? { id: row.project.id, name: row.project.name } : null }));
    return { sessions, total, nextCursor: rows.length > 20 ? sessions.at(-1)?.id : null };
  },
};
