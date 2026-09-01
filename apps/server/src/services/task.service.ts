import { SkillService } from './skill.service';
import { prisma } from '../prisma';
import { taskRepository } from '../repositories/task.repository';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { domainEventBus } from '../events/eventBus';
import { runInTransaction } from '../prisma';

export class TaskService {
  
  async rebalanceTasks(workspaceId: string): Promise<void> {
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    let currentStatus = '';
    let currentOrder = 0;
    
    for (const task of tasks) {
      if (task.status !== currentStatus) {
        currentStatus = task.status;
        currentOrder = 1000;
      } else {
        currentOrder += 1000;
      }
      
      await prisma.task.update({
        where: { id: task.id },
        data: { position: currentOrder }
      });
    }
  }

  async listTasks(workspaceId: string, filters: { projectId?: string; sprintId?: string; status?: string }) {
    return taskRepository.findManyByWorkspace(workspaceId, {
      ...filters,
      status: filters.status as TaskStatus,
    });
  }

  async getTask(id: string, workspaceId: string) {
    const task = await taskRepository.findById(id);
    if (!task || task.deletedAt || task.workspaceId !== workspaceId) {
      throw new Error('Task not found');
    }
    return task;
  }

  async createTask(data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const maxPos = await taskRepository.findMaxPosition(data.workspaceId, tx);
      const position = maxPos + 1.0;
      if (data.skillIds !== undefined) {
        await SkillService.validateSkillLinking(userId, data.workspaceId, data.skillIds);
        const ids = data.skillIds;
        delete data.skillIds;
        (data as any).skills = { connect: ids.map((id: string) => ({ id })) };
      }

      if (data.sprintId) {
        const sprint = await tx.sprint.findUnique({ where: { id: data.sprintId } });
        if (!sprint || sprint.workspaceId !== data.workspaceId) throw new Error('Conflict: invalid sprint scoping');
      }
      if (data.projectId) {
        const project = await tx.project.findUnique({ where: { id: data.projectId } });
        if (!project || project.workspaceId !== data.workspaceId) throw new Error('Conflict: invalid project scoping');
      }

      const task = await taskRepository.create({
        ...data,
        position,
        createdBy: userId,
        updatedBy: userId,
      }, tx);

      domainEventBus.emitEvent('TASK_CREATED', { taskId: task.id, workspaceId: task.workspaceId });
      return task;
    });
  }

  async updateTask(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { version, workspaceId: _, ...updateData } = data;
      if (updateData.skillIds !== undefined) {
        await SkillService.validateSkillLinking(userId, workspaceId, updateData.skillIds);
        const ids = updateData.skillIds;
        delete updateData.skillIds;
        (updateData as any).skills = { set: ids.map((id: string) => ({ id })) };
      }

      if (updateData.sprintId) {
        const sprint = await tx.sprint.findUnique({ where: { id: updateData.sprintId } });
        if (!sprint || sprint.workspaceId !== workspaceId) throw new Error('Conflict: invalid sprint scoping');
      }
      if (updateData.projectId) {
        const project = await tx.project.findUnique({ where: { id: updateData.projectId } });
        if (!project || project.workspaceId !== workspaceId) throw new Error('Conflict: invalid project scoping');
      }

      const task = await taskRepository.update(id, {
        ...updateData,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      domainEventBus.emitEvent('TASK_UPDATED', { taskId: task.id, workspaceId: task.workspaceId });
      
      if (existing.status !== 'DONE' && updateData.status === 'DONE') {
        domainEventBus.emitEvent('TASK_COMPLETED', { taskId: task.id, workspaceId: task.workspaceId, userId });
      }
      return task;
    });
  }

  async deleteTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      const task = await taskRepository.update(id, {
        deletedAt: new Date(),
        updatedBy: userId,
      }, tx);

      domainEventBus.emitEvent('TASK_DELETED', { taskId: task.id, workspaceId: task.workspaceId });
      return task;
    });
  }

  async reorderTask(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      if (existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const task = await taskRepository.update(id, {
        position: data.position,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      return task;
    });
  }

  async completeTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      const isNewlyCompleted = existing.status !== TaskStatus.DONE;

      const task = await taskRepository.update(id, {
        status: TaskStatus.DONE,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      if (isNewlyCompleted) {
        domainEventBus.emitEvent('TASK_COMPLETED', { taskId: task.id, workspaceId: task.workspaceId, userId });
      }
      return task;
    });
  }

  async restoreTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing) throw new Error('Task not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      const task = await taskRepository.update(id, {
        deletedAt: null,
        updatedBy: userId
      }, tx);

      domainEventBus.emitEvent('TASK_RESTORED', { taskId: task.id, workspaceId: task.workspaceId });
      return task;
    });
  }
}

export const taskService = new TaskService();

