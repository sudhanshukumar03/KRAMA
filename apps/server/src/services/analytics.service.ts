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
