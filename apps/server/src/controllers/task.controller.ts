import type { Request, Response } from 'express';
import { CreateTaskSchema, UpdateTaskSchema, ReorderSchema } from '@krama/validation';
import { taskService } from '../services/task.service';
import { handleControllerError } from '../utils/errors';

export const listTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'workspaceId is required' });

    const tasks = await taskService.listTasks(workspaceId, {
      projectId: req.query.projectId as string,
      sprintId: req.query.sprintId as string,
      status: req.query.status as string,
    });
    
    return res.status(200).json(tasks);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to list tasks');
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.getTask((req.params.id as string), workspaceId);
    return res.status(200).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to get task');
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'workspaceId is required' });

    const data = CreateTaskSchema.parse({ ...req.body, workspaceId });
    if (req.body.parentTaskId !== undefined) {
      (data as any).parentTaskId = req.body.parentTaskId;
    }
    const task = await taskService.createTask(data, req.user!.id);
    return res.status(201).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create task');
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const data = UpdateTaskSchema.parse(req.body);
    if (req.body.metadata !== undefined) {
      (data as any).metadata = req.body.metadata;
    }
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (data.workspaceId as string);
    const task = await taskService.updateTask((req.params.id as string), workspaceId, data, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update task');
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    await taskService.deleteTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete task');
  }
};

export const reorderTask = async (req: Request, res: Response) => {
  try {
    const data = ReorderSchema.parse(req.body);
    const task = await taskService.reorderTask((req.params.id as string), data.workspaceId, data, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to reorder task');
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.completeTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to complete task');
  }
};

export const restoreTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.restoreTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to restore task');
  }
};

export const rebalanceTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'workspaceId is required' });
    await taskService.rebalanceTasks(workspaceId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleControllerError(res, error, 'Failed to rebalance tasks');
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;
    const userId = req.user!.id;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!content) return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Content is required' });

    const { prisma } = await import('../prisma');
    
    // Check task exists
    const task = await prisma.task.findUnique({ where: { id, workspaceId } });
    if (!task) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Task not found' });

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        authorId: userId
      },
      include: {
        author: { select: { name: true } }
      }
    });

    return res.status(201).json(comment);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to add comment');
  }
};
