import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';

;
import { calculateHabitStreak } from '../services/habitStreak.service';

export const habitStreakWorker = new Worker(
  QUEUE_NAMES.HABIT_STREAK,
  async (job) => {
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
      // Extract user's timezone if available, fallback to Asia/Kolkata
      const user = (habit as any).workspace?.members?.[0]?.user;
      const timeZone = (user?.metadata as any)?.timezone || (user?.countryCode === 'IN' ? 'Asia/Kolkata' : 'Asia/Kolkata');

      const currentStreak = calculateHabitStreak(habit, now, timeZone);

      if (habit.streak !== currentStreak) {
        await prisma.habit.update({
          where: { id: habit.id },
          data: { streak: currentStreak },
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
