import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

function calculateStreak(completedDateStrs: string[], todayStr: string): number {
  const set = new Set(completedDateStrs);
  
  // Calculate yesterday's date string
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const yesterdayDate = new Date(todayDate.getTime() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0] || '';

  // Determine starting point for consecutive count:
  // If today is completed, start counting from today.
  // If today is NOT completed, check if yesterday is completed. If so, start from yesterday (streak preserved!).
  // If neither today nor yesterday is completed, the streak has been broken (return 0).
  let currentStr = todayStr;
  if (!set.has(todayStr)) {
    if (set.has(yesterdayStr)) {
      currentStr = yesterdayStr;
    } else {
      return 0;
    }
  }

  let streak = 0;
  let curr = new Date(`${currentStr}T00:00:00.000Z`);
  while (true) {
    const str = curr.toISOString().split('T')[0] || '';
    if (set.has(str)) {
      streak++;
      curr = new Date(curr.getTime() - 86400000); // step back 1 day
    } else {
      break;
    }
  }
  return streak;
}

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habits = await prisma.habit.findMany({
      include: { 
        linkedGoal: true,
        completions: { orderBy: { date: 'desc' } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(habits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habitId = req.params.id as string;
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { 
        linkedGoal: true,
        completions: { orderBy: { date: 'desc' } }
      },
    });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, cadence, linkedGoalId, category, timeOfDay, difficulty, duration, streak } = req.body;
    if (!name || !cadence) {
      res.status(400).json({ error: 'Name and cadence are required' });
      return;
    }
    const habit = await prisma.habit.create({
      data: {
        name,
        cadence,
        linkedGoalId: linkedGoalId || null,
        category: category || null,
        timeOfDay: timeOfDay || null,
        difficulty: difficulty || null,
        duration: duration !== undefined ? Number(duration) : null,
        streak: streak !== undefined ? Number(streak) : 0,
      },
      include: { 
        linkedGoal: true,
        completions: { orderBy: { date: 'desc' } }
      },
    });
    res.status(201).json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habitId = req.params.id as string;
    const { name, cadence, linkedGoalId, category, timeOfDay, difficulty, duration, streak, lastCompletedAt } = req.body;
    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(name !== undefined && { name }),
        ...(cadence !== undefined && { cadence }),
        ...(linkedGoalId !== undefined && { linkedGoalId }),
        ...(category !== undefined && { category }),
        ...(timeOfDay !== undefined && { timeOfDay }),
        ...(difficulty !== undefined && { difficulty }),
        ...(duration !== undefined && { duration: duration !== null ? Number(duration) : null }),
        ...(streak !== undefined && { streak: Number(streak) }),
        ...(lastCompletedAt !== undefined && { lastCompletedAt: lastCompletedAt ? new Date(lastCompletedAt) : null }),
      },
      include: { 
        linkedGoal: true,
        completions: { orderBy: { date: 'desc' } }
      },
    });
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.body || {};
    const habitId = req.params.id as string;
    const existingHabit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!existingHabit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Determine target date (default to today local YYYY-MM-DD)
    const now = new Date();
    const defaultTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0] || '';
    const targetDateStr = (date && typeof date === 'string' ? (date.split('T')[0] || defaultTodayStr) : defaultTodayStr);
    const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    // Check if completion exists for this habit and targetDate
    const existingCompletion = await prisma.habitCompletion.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: targetDate,
        }
      }
    });

    if (existingCompletion) {
      // Uncheck: delete completion
      await prisma.habitCompletion.delete({
        where: { id: existingCompletion.id }
      });
    } else {
      // Check: create completion
      await prisma.habitCompletion.create({
        data: {
          habitId,
          date: targetDate,
          completed: true
        }
      });
    }

    // Now recalculate streak and lastCompletedAt from all historical completions
    const allCompletions = await prisma.habitCompletion.findMany({
      where: { habitId, completed: true },
      orderBy: { date: 'desc' }
    });

    const completedDateStrs = allCompletions.map(c => c.date.toISOString().split('T')[0] || '');
    const newStreak = calculateStreak(completedDateStrs, defaultTodayStr);
    const firstComp = allCompletions[0];
    const newLastCompletedAt = firstComp ? firstComp.date : null;

    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        streak: newStreak,
        lastCompletedAt: newLastCompletedAt
      },
      include: {
        linkedGoal: true,
        completions: { orderBy: { date: 'desc' } }
      }
    });

    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habitId = req.params.id as string;
    await prisma.habit.delete({
      where: { id: habitId },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
