import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction, prisma } from '../prisma';

class WorkspaceService {
  async listWorkspaces(userId: string) {
    return workspaceRepository.findAll({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId
          }
        }
      }
    });
  }

  async getWorkspace(id: string) {
    const workspace = await workspaceRepository.findById(id);
    if (!workspace || workspace.deletedAt) {
      throw new Error('Workspace not found');
    }
    return workspace;
  }

  async createWorkspace(data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const workspace = await workspaceRepository.create({
        ...data,
        createdBy: userId,
      }, tx);

      await workspaceRepository.addMember(workspace.id, userId, 'OWNER', tx);
      return workspace;
    });
  }

  async updateWorkspace(id: string, data: any) {
    const existing = await workspaceRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new Error('Workspace not found');
    }

    return workspaceRepository.update(id, data);
  }

  async deleteWorkspace(id: string, userId: string = 'system') {
    const existing = await workspaceRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new Error('Workspace not found');
    }

    const now = new Date();

    return runInTransaction(async (tx) => {
      // 1. Soft-delete the workspace itself
      await tx.workspace.update({
        where: { id },
        data: { deletedAt: now, updatedBy: userId }
      });

      // 2. Cascade to direct workspace-scoped children
      await tx.space.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now }
      });

      await tx.project.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.goal.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.habit.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.task.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.sprint.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.dailyLog.updateMany({
        where: { workspaceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      // 3. Cascade to indirect children (Documents are space-scoped)
      const spaces = await tx.space.findMany({ where: { workspaceId: id }, select: { id: true } });
      const spaceIds = spaces.map((s: any) => s.id);

      if (spaceIds.length > 0) {
        await tx.document.updateMany({
          where: { spaceId: { in: spaceIds }, deletedAt: null },
          data: { deletedAt: now, lastEditedById: userId }
        });
      }

      return { success: true };
    });
  }

  async exportWorkspace(id: string) {
    const workspace = await workspaceRepository.findById(id);
    if (!workspace || workspace.deletedAt) {
      throw new Error('Workspace not found');
    }

    const data = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          select: { role: true, user: { select: { id: true, name: true, email: true } } }
        },
        goals: { where: { deletedAt: null } },
        projects: { where: { deletedAt: null } },
        spaces: { where: { deletedAt: null } },
        tasks: { where: { deletedAt: null } },
        sprints: { where: { deletedAt: null } },
        habits: { where: { deletedAt: null } },
      }
    });

    return data;
  }
}

export const workspaceService = new WorkspaceService();
