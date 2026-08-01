// @ts-nocheck
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';

const prisma = new PrismaClient();

export const analyticsWorker = new Worker(
  QUEUE_NAMES.ANALYTICS,
  async (job) => {
    console.log(`[Worker:Analytics] Running analytics aggregation...`);

    const workspaces = await prisma.workspace.findMany({
      where: { deletedAt: null },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let generatedCount = 0;

    for (const workspace of workspaces) {
      // 1. Weekly Velocity (Tasks completed in last 7 days)
      const weeklyVelocity = await prisma.task.count({
        where: {
          workspaceId: workspace.id,
          status: 'done',
          updatedAt: { gte: sevenDaysAgo },
          deletedAt: null,
        },
      });

      // 2. Active Streaks
      const activeStreaks = await prisma.habit.count({
        where: {
          workspaceId: workspace.id,
          streak: { gt: 0 },
          deletedAt: null,
        },
      });

      // 3. OKR Pace (Avg goal progress)
      const goals = await prisma.goal.findMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        select: { progress: true },
      });
      const okrPace = goals.length > 0 
        ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length 
        : 0;

      // 4. Deep Work Logged Today
      const logs = await prisma.dailyLog.findMany({
        where: {
          workspaceId: workspace.id,
          date: { gte: today },
          deletedAt: null,
        },
      });
      const deepWorkLogged = logs.reduce((sum, l) => sum + (l.deepWorkMinutes || 0), 0);

      // Upsert Analytics row for today
      await prisma.workspaceAnalytics.upsert({
        where: {
          workspaceId_date: {
            workspaceId: workspace.id,
            date: today,
          },
        },
        update: {
          weeklyVelocity,
          activeStreaks,
          okrPace,
          deepWorkLogged,
        },
        create: {
          workspaceId: workspace.id,
          date: today,
          weeklyVelocity,
          activeStreaks,
          okrPace,
          deepWorkLogged,
        },
      });

      generatedCount++;
    }

    return { generatedAnalytics: generatedCount };
  },
  { connection }
);

analyticsWorker.on('completed', (job, result) => {
  console.log(`[Worker:Analytics] Generated analytics for ${result.generatedAnalytics} workspaces.`);
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`[Worker:Analytics] Failed:`, err);
});
