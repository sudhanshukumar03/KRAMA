import { createHash } from 'node:crypto';
import { prisma } from '../prisma';
import { habitRepository } from '../repositories/habit.repository';
import { calculateHabitStats, getUserLocalDateStr, resolveUserTimeZone } from './habitStreak.service';

type Stats = { current: number; best: number };
type Day = { date: string; offSchedule: boolean };
type Snapshot = { signature: string; expires: number; stats: ReadonlyMap<string, Stats>; days: ReadonlyMap<string, Day[]>; size: number };
const cache = new Map<string, Snapshot>();
const pending = new Map<string, Promise<Snapshot>>();
function retain(scope: string, snapshot: Snapshot) {
  cache.delete(scope);
  if (snapshot.size > 24000) return;
  let size = [...cache.values()].reduce((sum, entry) => sum + entry.size, 0);
  while (cache.size && (cache.size >= 32 || size + snapshot.size > 24000)) {
    const oldest = cache.keys().next().value!; size -= cache.get(oldest)!.size; cache.delete(oldest);
  }
  cache.set(scope, snapshot);
}

/**
 * Cache only derived numbers and canonical day keys. Each read checks the database fingerprint first,
 * so log/undo, schedule edits and midnight cannot reuse another history's stats.
 * No notes, user tokens or unscoped completion rows enter this bounded cache.
 */
export async function readPersonalHabits(workspaceId: string, userId: string, requestedZone?: string, view: 'full' | 'tracker' = 'full') {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
  const zone = resolveUserTimeZone(user, requestedZone);
  const now = new Date();
  const habits = await prisma.habit.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!habits.length) return [];
  const ids = habits.map(habit => habit.id);
  const history = await prisma.habitCompletion.groupBy({
    by: ['habitId'], where: { userId, habitId: { in: ids } }, _count: { _all: true }, _max: { completedAt: true },
  });
  const signature = createHash('sha256').update(JSON.stringify({
    habits: [...habits].sort((a, b) => a.id.localeCompare(b.id)).map(habit => [habit.id, habit.version, habit.updatedAt.toISOString()]),
    history: history.sort((a, b) => a.habitId.localeCompare(b.habitId)),
  })).digest('hex');
  const scope = `${workspaceId}:${userId}:${zone}:${getUserLocalDateStr(now, zone)}`;
  let snapshot = cache.get(scope);
  if (!snapshot || snapshot.signature !== signature || snapshot.expires <= Date.now()) {
    const key = `${scope}:${signature}`;
    let computation = pending.get(key);
    if (!computation) {
      computation = (async () => {
        const rows = await prisma.habitCompletion.findMany({
          where: { userId, habitId: { in: ids } }, select: { habitId: true, date: true, offSchedule: true },
        });
        const byHabit = new Map<string, typeof rows>();
        for (const row of rows) {
          const completions = byHabit.get(row.habitId);
          if (completions) completions.push(row); else byHabit.set(row.habitId, [row]);
        }
        const stats = new Map(habits.map(habit => [habit.id, calculateHabitStats({ ...habit, completions: byHabit.get(habit.id) || [] }, now, zone)]));
        const days = new Map(habits.map(habit => [habit.id, (byHabit.get(habit.id) || [])
          .sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 120)
          .map(row => ({ date: row.date.toISOString(), offSchedule: row.offSchedule }))]));
        const result: Snapshot = { signature, stats, days, expires: Date.now() + 60000, size: [...days.values()].reduce((sum, rows) => sum + rows.length, 0) };
        retain(scope, result); return result;
      })();
      pending.set(key, computation);
      void computation.finally(() => pending.delete(key)).catch(() => {});
    }
    snapshot = await computation;
  }
  const full = view === 'full' ? await habitRepository.findRecentCompletions(workspaceId, userId) : [];
  const fullByHabit = new Map<string, typeof full>();
  for (const row of full) { const rows = fullByHabit.get(row.habitId); if (rows) rows.push(row); else fullByHabit.set(row.habitId, [row]); }
  return habits.map(habit => ({ ...habit,
    streak: snapshot!.stats.get(habit.id)?.current ?? 0, bestStreak: snapshot!.stats.get(habit.id)?.best ?? 0,
    completions: view === 'tracker' ? snapshot!.days.get(habit.id) || [] : fullByHabit.get(habit.id) || [],
  }));
}
