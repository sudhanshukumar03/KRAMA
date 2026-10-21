import { prisma } from '../prisma';
import { calculateHabitStats, resolveUserTimeZone } from './habitStreak.service';

/** Refresh the legacy stored snapshot; API reads calculate each user's own stats. */
export async function recalculateHabitStreaks(now?: Date) {
  const habits = await prisma.habit.findMany({ where: { deletedAt: null }, select: { id: true } });
  for (const { id } of habits) {
    await prisma.$transaction(async tx => {
      // Log/undo also lock this row. Read history after the lock so an hourly
      // refresh cannot overwrite a completion committed while it was waiting.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Habit" WHERE id = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!locked.length) return;
      const habit = await tx.habit.findUnique({ where: { id }, include: { workspace: { select: { createdBy: true } } } });
      if (!habit || habit.deletedAt) return;
      // Ordinary edits change updatedBy without changing whose streak is stored.
      // Log/Undo record the snapshot user explicitly; old rows use the creator.
      const metadata = habit.metadata && typeof habit.metadata === 'object' && !Array.isArray(habit.metadata) ? habit.metadata : {};
      const userId = typeof metadata.streakUserId === 'string' ? metadata.streakUserId : habit.createdBy || habit.workspace.createdBy;
      if (!userId) return;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
      if (!user) return;
      const completions = await tx.habitCompletion.findMany({ where: { habitId: id, userId }, select: { date: true, offSchedule: true } });
      const { current, best } = calculateHabitStats({ ...habit, completions }, now ?? new Date(), resolveUserTimeZone(user));
      if (habit.streak !== current || habit.bestStreak !== best) {
        await tx.habit.update({ where: { id }, data: { streak: current, bestStreak: best } });
      }
    });
  }
  return { processedHabits: habits.length };
}
