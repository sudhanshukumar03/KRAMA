import { prisma } from '../prisma';

export const analyticsService = {
  async getOverview(workspaceId: string, range: '7d' | '30d' | '90d') {
    const days = parseInt(range.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.workspaceAnalytics.findMany({
      where: {
        workspaceId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasToday = analytics.some(a => new Date(a.date).toDateString() === today.toDateString());
    if (!hasToday) {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [weeklyVelocity, activeStreaks, goals, logs] = await Promise.all([
        prisma.task.count({
          where: { workspaceId, status: 'DONE', updatedAt: { gte: sevenDaysAgo }, deletedAt: null },
        }),
        prisma.habit.count({
          where: { workspaceId, streak: { gt: 0 }, deletedAt: null },
        }),
        prisma.goal.findMany({
          where: { workspaceId, deletedAt: null },
          select: { progress: true },
        }),
        prisma.dailyLog.findMany({
          where: { workspaceId, date: { gte: today }, deletedAt: null },
        }),
      ]);

      const okrPace = goals.length > 0
        ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
        : 0;
      const deepWorkLogged = logs.reduce((sum, l) => sum + (l.deepWorkMinutes || 0), 0);

      const todayRecord = await prisma.workspaceAnalytics.upsert({
        where: { workspaceId_date: { workspaceId, date: today } },
        update: { weeklyVelocity, activeStreaks, okrPace, deepWorkLogged },
        create: { workspaceId, date: today, weeklyVelocity, activeStreaks, okrPace, deepWorkLogged },
      });
      analytics.push(todayRecord);
      analytics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return analytics;
  },

  async getFocusHistory(workspaceId: string, range: '7d' | '30d' | '90d') {
    const days = parseInt(range.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await prisma.focusSession.findMany({
      where: {
        workspaceId,
        startTime: { gte: startDate }
      },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 100 // Cap to prevent massive payloads, though pagination is ideal long-term
    });

    return sessions;
  },

  async getHabitHeatmap(workspaceId: string, habitId: string, range: '30d' | '90d' | '365d') {
    const days = parseInt(range.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completions = await prisma.habitCompletion.findMany({
      where: {
        habitId,
        habit: { workspaceId },
        completedAt: { gte: startDate }
      },
      orderBy: { completedAt: 'asc' }
    });

    return completions;
  }
};
