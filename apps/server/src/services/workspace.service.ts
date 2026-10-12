import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction, prisma } from '../prisma';
import { socketService } from './socket.service';

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

    const result = await runInTransaction(async (tx) => {
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
    socketService.disconnectWorkspace(id);
    return result;
  }

  async exportWorkspace(id: string) {
    const workspace = await workspaceRepository.findById(id);
    if (!workspace || workspace.deletedAt) {
      throw new Error('Workspace not found');
    }

    return prisma.$transaction(async tx => {
    const data = await tx.workspace.findUniqueOrThrow({
      where: { id, deletedAt: null },
      include: {
        members: {
          select: { role: true, user: { select: { id: true, name: true, email: true } } }
        },
        goals: { include: { snapshots: true } },
        projects: { include: { milestones: true } },
        spaces: { include: { folders: true, documents: { include: { versions: true, tags: { where: { tag: { workspaceId: id } } } } } } },
        tasks: { include: { comments: true, labels: { where: { label: { workspaceId: id } } } } },
        habits: { include: { completions: true } },
        timeBlocks: true, focusSessions: true, dailyLogs: true, sprints: true,
        sprintReports: true, tags: true, labels: true, activityLogs: true,
        notifications: true,
      }
    });
    const ids: Record<string, Set<string>> = {
      DOCUMENT: new Set(data.spaces.flatMap(space => space.documents.map(doc => doc.id))),
      TASK: new Set(data.tasks.map(task => task.id)), PROJECT: new Set(data.projects.map(project => project.id)),
    };
    const links = await tx.entityLink.findMany({ where: { OR: Object.entries(ids).flatMap(([entityType, entityIds]) => {
      const type = entityType as 'DOCUMENT' | 'TASK' | 'PROJECT';
      return [
        { sourceType: type, sourceId: { in: [...entityIds] } },
        { targetType: type, targetId: { in: [...entityIds] } },
      ];
    }) } });
    return {
      format: 'krama-workspace-backup', formatVersion: 2, exportedAt: new Date().toISOString(),
      includesTrash: true, workspace: data,
      entityLinks: links.filter(link => ids[link.sourceType]?.has(link.sourceId) && ids[link.targetType]?.has(link.targetId)),
      excluded: ['Authentication secrets and sessions', 'Regenerable search vectors and embeddings', 'AI provider telemetry'],
    };
    }, { isolationLevel: 'RepeatableRead', timeout: 30000 });
  }
}

export const workspaceService = new WorkspaceService();
