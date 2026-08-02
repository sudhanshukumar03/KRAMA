import type { BaseRepository } from './base.repository';
import type { Habit, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';
export declare class HabitRepository implements BaseRepository<Habit, Prisma.HabitUncheckedCreateInput, Prisma.HabitUncheckedUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<Habit | null>;
    findAll(options?: Prisma.HabitFindManyArgs, tx?: TxClient): Promise<Habit[]>;
    findManyByWorkspace(workspaceId: string, tx?: TxClient): Promise<Habit[]>;
    create(data: Prisma.HabitUncheckedCreateInput, tx?: TxClient): Promise<Habit>;
    update(id: string, data: Prisma.HabitUncheckedUpdateInput, tx?: TxClient): Promise<Habit>;
    delete(id: string, tx?: TxClient): Promise<Habit>;
    addCompletion(data: Prisma.HabitCompletionUncheckedCreateInput, tx?: TxClient): Promise<any>;
    getCompletionCountToday(habitId: string, todayStart: Date, todayEnd: Date, tx?: TxClient): Promise<number>;
}
export declare const habitRepository: HabitRepository;
//# sourceMappingURL=habit.repository.d.ts.map
