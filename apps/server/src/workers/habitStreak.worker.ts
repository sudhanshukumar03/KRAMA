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
        iterDate.setUTCHours(12, 0, 0, 0); // Normalize to UTC noon (new dateKey standard)

        // Track consumed completions to prevent double-counting across overlapping day windows
        const consumedCompletionIds = new Set<string>();

        const consumeCompletionForDay = (targetDate: Date) => {
          const targetTime = targetDate.getTime();
          
          const match = habit.completions.find((c: any) => {
             if (c.offSchedule) return false;
             if (consumedCompletionIds.has(c.id)) return false;
             const t = c.date.getTime(); // Use the canonical date column
             return t === targetTime;
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
