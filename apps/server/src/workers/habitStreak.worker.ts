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
      if (habit.completions.length > 0) {
        let lastDate = new Date(); // Today
        lastDate.setHours(0,0,0,0);
        
        let iterDate = new Date(lastDate);

        for (let log of habit.completions) {
          const logDate = new Date(log.completedAt);
          logDate.setHours(0,0,0,0);
          
          const diffDays = Math.round((iterDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24));
          
          if (diffDays === 0) {
            currentStreak++;
            iterDate.setDate(iterDate.getDate() - 1);
          } else if (diffDays === 1) {
            currentStreak++;
            iterDate.setDate(iterDate.getDate() - 1);
          } else if (diffDays > 1) {
            break;
          }
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
