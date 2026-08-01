import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Workspace, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

export class WorkspaceRepository implements BaseRepository<Workspace, Prisma.WorkspaceCreateInput, Prisma.WorkspaceUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Workspace | null> {
    return (tx || prisma).workspace.findUnique({ where: { id } });
  }

  async findAll(options?: Prisma.WorkspaceFindManyArgs, tx?: TxClient): Promise<Workspace[]> {
    return (tx || prisma).workspace.findMany(options || {});
  }

  async create(data: Prisma.WorkspaceCreateInput, tx?: TxClient): Promise<Workspace> {
    return (tx || prisma).workspace.create({ data });
  }

  async update(id: string, data: Prisma.WorkspaceUpdateInput, tx?: TxClient): Promise<Workspace> {
    return (tx || prisma).workspace.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TxClient): Promise<Workspace> {
    return (tx || prisma).workspace.delete({ where: { id } });
  }

  async addMember(workspaceId: string, userId: string, role: string, tx?: TxClient): Promise<void> {
    await (tx || prisma).workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: role as any,
      }
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
