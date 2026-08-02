import type { BaseRepository } from './base.repository';
import type { User, Prisma } from '@prisma/client';
export type TxClient = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
export declare class UserRepository implements BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<User | null>;
    findByEmail(email: string, tx?: TxClient): Promise<User | null>;
    findAll(options?: Prisma.UserFindManyArgs, tx?: TxClient): Promise<User[]>;
    create(data: Prisma.UserCreateInput, tx?: TxClient): Promise<User>;
    update(id: string, data: Prisma.UserUpdateInput, tx?: TxClient): Promise<User>;
    delete(id: string, tx?: TxClient): Promise<User>;
}
export declare const userRepository: UserRepository;
//# sourceMappingURL=user.repository.d.ts.map
