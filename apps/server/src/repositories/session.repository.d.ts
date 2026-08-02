import type { BaseRepository } from './base.repository';
import type { Session, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';
export declare class SessionRepository implements BaseRepository<Session, Prisma.SessionUncheckedCreateInput, Prisma.SessionUncheckedUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<Session | null>;
    findByHash(hash: string, tx?: TxClient): Promise<Session | null>;
    findAll(options?: Prisma.SessionFindManyArgs, tx?: TxClient): Promise<Session[]>;
    findActiveByUserId(userId: string, tx?: TxClient): Promise<Session[]>;
    create(data: Prisma.SessionUncheckedCreateInput, tx?: TxClient): Promise<Session>;
    update(id: string, data: Prisma.SessionUncheckedUpdateInput, tx?: TxClient): Promise<Session>;
    updateByHash(hash: string, data: Prisma.SessionUncheckedUpdateInput, tx?: TxClient): Promise<Session>;
    updateManyActiveByUserId(userId: string, data: Prisma.SessionUpdateManyMutationInput, tx?: TxClient): Promise<void>;
    delete(id: string, tx?: TxClient): Promise<Session>;
}
export declare const sessionRepository: SessionRepository;
//# sourceMappingURL=session.repository.d.ts.map
