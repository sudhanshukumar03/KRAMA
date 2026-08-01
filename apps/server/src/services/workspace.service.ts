import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction } from '../prisma';

export class WorkspaceService {
  async listWorkspaces() {
    return workspaceRepository.findAll();
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
}

export const workspaceService = new WorkspaceService();
