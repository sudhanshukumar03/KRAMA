import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';

import { prisma } from '../prisma';

export const habitStreakWorker = new Worker(
  QUEUE_NAMES.HABIT_STREAK,
  async (job) => {
    console.log(`[Worker:HabitStreak] Running nightly recalculation...`);

    const habits = await prisma.habit.findMany({
      where: { deletedAt: null },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    for (const habit of habits) {
      let currentStreak = 0;
      const scheduled = habit.scheduledDays && habit.scheduledDays.length > 0 
        ? habit.scheduledDays 
        : [0, 1, 2, 3, 4, 5, 6];

      if (habit.completions.length > 0) {
        let iterDate = new Date();
        iterDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight, ignore server timezone

        // Track consumed completions to prevent double-counting across overlapping day windows
        const consumedCompletionIds = new Set<string>();

        // Helper: Widen tolerance to accurately span all global timezones (-14h to +36h).
        // A 50-hour window safely covers from UTC+14 to UTC-12.
        const consumeCompletionForDay = (targetDate: Date) => {
          const targetTime = targetDate.getTime();
          const windowStart = targetTime - (14 * 60 * 60 * 1000); // 14 hours before UTC midnight (UTC+14)
          const windowEnd = targetTime + (36 * 60 * 60 * 1000); // 36 hours after UTC midnight (UTC-12)
          
          const match = habit.completions.find((c: any) => {
             if (consumedCompletionIds.has(c.id)) return false;
             const t = new Date(c.completedAt).getTime();
             return t >= windowStart && t <= windowEnd;
          });

          if (match) {
            consumedCompletionIds.add(match.id);
            return true;
          }
          return false;
        };

        // Check today
        if (consumeCompletionForDay(iterDate)) {
          currentStreak++;
        }

        // Walk backwards
        iterDate.setUTCDate(iterDate.getUTCDate() - 1);
        while (true) {
          if (scheduled.includes(iterDate.getUTCDay())) {
            if (consumeCompletionForDay(iterDate)) {
              currentStreak++;
            } else {
              break; // Streak broken
            }
          }
          iterDate.setUTCDate(iterDate.getUTCDate() - 1);
        }
      }

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
