import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';

import { calculateHabitStats, resolveUserTimeZone } from '../services/habitStreak.service';

export const habitStreakWorker = new Worker(
  QUEUE_NAMES.HABIT_STREAK,
  async (_job) => {
    console.log(`[Worker:HabitStreak] Running streak recalculation...`);

    const habits = await prisma.habit.findMany({
      where: { deletedAt: null },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: true }
            }
          }
        },
        completions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    const now = new Date();

    for (const habit of habits) {
      // Resolve the user's timezone identically to the log-time recompute so
      // the nightly value and the log-time value never disagree (A1).
      const user = (habit as any).workspace?.members?.[0]?.user;
      const timeZone = resolveUserTimeZone(user);

      const { current, best } = calculateHabitStats(habit, now, timeZone);

      if (habit.streak !== current || (habit as any).bestStreak !== best) {
        await prisma.habit.update({
          where: { id: habit.id },
          data: { streak: current, bestStreak: best },
        });
      }
    }

    return { processedHabits: habits.length };
  },
  { connection }
);

habitStreakWorker.on('completed', (job, result) => {
  console.log(`[Worker:HabitStreak] Completed recalculating streaks for ${result.processedHabits} habits.`);
});

habitStreakWorker.on('failed', (job, err) => {
  console.error(`[Worker:HabitStreak] Failed:`, err);
});

habitStreakWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
