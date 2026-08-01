import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { User, Prisma } from '@prisma/client';

export type TxClient = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class UserRepository implements BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<User | null> {
    return (tx || prisma).user.findUnique({ where: { id } });
  }

  async findByEmail(email: string, tx?: TxClient): Promise<User | null> {
    return (tx || prisma).user.findUnique({ 
      where: { email },
      include: {
        memberships: {
          select: { workspaceId: true, role: true }
        }
      }
    });
  }

  async findAll(options?: Prisma.UserFindManyArgs, tx?: TxClient): Promise<User[]> {
    return (tx || prisma).user.findMany(options || {});
  }

  async create(data: Prisma.UserCreateInput, tx?: TxClient): Promise<User> {
    return (tx || prisma).user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput, tx?: TxClient): Promise<User> {
    return (tx || prisma).user.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TxClient): Promise<User> {
    return (tx || prisma).user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();
