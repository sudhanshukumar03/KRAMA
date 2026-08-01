import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Session, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

export class SessionRepository implements BaseRepository<Session, Prisma.SessionUncheckedCreateInput, Prisma.SessionUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Session | null> {
    return (tx || prisma).session.findUnique({ where: { id } });
  }

  async findByHash(hash: string, tx?: TxClient): Promise<Session | null> {
    return (tx || prisma).session.findUnique({ where: { refreshTokenHash: hash } });
  }

  async findAll(options?: Prisma.SessionFindManyArgs, tx?: TxClient): Promise<Session[]> {
    return (tx || prisma).session.findMany(options || {});
  }

  async findActiveByUserId(userId: string, tx?: TxClient): Promise<Session[]> {
    return (tx || prisma).session.findMany({
      where: { userId, revokedAt: null },
    });
  }

  async create(data: Prisma.SessionUncheckedCreateInput, tx?: TxClient): Promise<Session> {
    return (tx || prisma).session.create({ data });
  }

  async update(id: string, data: Prisma.SessionUncheckedUpdateInput, tx?: TxClient): Promise<Session> {
    return (tx || prisma).session.update({ where: { id }, data });
  }

  async updateByHash(hash: string, data: Prisma.SessionUncheckedUpdateInput, tx?: TxClient): Promise<Session> {
    return (tx || prisma).session.update({ where: { refreshTokenHash: hash }, data });
  }

  async updateManyActiveByUserId(userId: string, data: Prisma.SessionUpdateManyMutationInput, tx?: TxClient): Promise<void> {
    await (tx || prisma).session.updateMany({
      where: { userId, revokedAt: null },
      data,
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Session> {
    return (tx || prisma).session.delete({ where: { id } });
  }
}

export const sessionRepository = new SessionRepository();
