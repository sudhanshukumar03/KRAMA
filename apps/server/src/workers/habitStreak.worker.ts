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
        const completedDates = new Set(
          habit.completions.map((c: any) => {
            const d = new Date(c.completedAt);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })
        );

        let iterDate = new Date();
        iterDate.setHours(0, 0, 0, 0);

        // Check today
        const todayStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
        if (completedDates.has(todayStr)) {
          currentStreak++;
        }

        // Walk backwards
        iterDate.setDate(iterDate.getDate() - 1);
        while (true) {
          if (scheduled.includes(iterDate.getDay())) {
            const dStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
            if (completedDates.has(dStr)) {
              currentStreak++;
            } else {
              break; // Streak broken
            }
          }
          iterDate.setDate(iterDate.getDate() - 1);
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
