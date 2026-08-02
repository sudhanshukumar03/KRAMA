import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction, prisma } from '../prisma';

export class WorkspaceService {
  async listWorkspaces(userId: string) {
    return workspaceRepository.findAll({
      where: {
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
    if (!workspace) {
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
    if (!existing) {
      throw new Error('Workspace not found');
    }

    return workspaceRepository.update(id, data);
  }

  async deleteWorkspace(id: string) {
    const existing = await workspaceRepository.findById(id);
    if (!existing) {
      throw new Error('Workspace not found');
    }

    return workspaceRepository.delete(id);
  }

  async exportWorkspace(id: string) {
    const workspace = await workspaceRepository.findById(id);
    if (!workspace) {
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
        pages: { where: { deletedAt: null } },
        tasks: { where: { deletedAt: null } },
        sprints: { where: { deletedAt: null } },
        habits: { where: { deletedAt: null } },
      }
    });

    return data;
  }
}

export const workspaceService = new WorkspaceService();
