import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { recalculateHabitStreaks } from '../services/habitStreakRecalculation.service';

export const habitStreakWorker = new Worker(
  QUEUE_NAMES.HABIT_STREAK,
  async (_job) => {
    console.log(`[Worker:HabitStreak] Running streak recalculation...`);

    return recalculateHabitStreaks();
  },
  { connection }
);

habitStreakWorker.on('completed', (_job, result) => {
  console.log(`[Worker:HabitStreak] Completed recalculating streaks for ${result.processedHabits} habits.`);
});

habitStreakWorker.on('failed', (_job, err) => {
  console.error(`[Worker:HabitStreak] Failed:`, err);
});

habitStreakWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
