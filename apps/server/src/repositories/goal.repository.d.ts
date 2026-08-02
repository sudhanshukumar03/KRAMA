import type { BaseRepository } from './base.repository';
import type { Goal, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';
export declare class GoalRepository implements BaseRepository<Goal, Prisma.GoalUncheckedCreateInput, Prisma.GoalUncheckedUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<Goal | null>;
    findAll(options?: Prisma.GoalFindManyArgs, tx?: TxClient): Promise<Goal[]>;
    findManyByWorkspace(workspaceId: string, tx?: TxClient): Promise<Goal[]>;
    create(data: Prisma.GoalUncheckedCreateInput, tx?: TxClient): Promise<Goal>;
    update(id: string, data: Prisma.GoalUncheckedUpdateInput, tx?: TxClient): Promise<Goal>;
    delete(id: string, tx?: TxClient): Promise<Goal>;
}
export declare const goalRepository: GoalRepository;
//# sourceMappingURL=goal.repository.d.ts.map
