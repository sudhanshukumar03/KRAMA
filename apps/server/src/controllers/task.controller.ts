import type { Request, Response } from 'express';
import { CreateTaskSchema, UpdateTaskSchema, ReorderSchema } from '@krama/validation';
import { taskService } from '../services/task.service';

export const listTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const tasks = await taskService.listTasks(workspaceId, {
      projectId: req.query.projectId as string,
      sprintId: req.query.sprintId as string,
      status: req.query.status as string,
    });
    
    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.getTask((req.params.id as string), workspaceId);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateTaskSchema.parse({ ...req.body, workspaceId });
    if (req.body.parentTaskId !== undefined) {
      (data as any).parentTaskId = req.body.parentTaskId;
    }
    const task = await taskService.createTask(data, req.user!.id);
    return res.status(201).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      console.error('ZOD ERROR:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
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
    console.error('updateTask error:', error);
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    await taskService.deleteTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Task deleted' });
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderTask = async (req: Request, res: Response) => {
  try {
    const data = ReorderSchema.parse(req.body);
    const task = await taskService.reorderTask((req.params.id as string), data.workspaceId, data, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.completeTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const restoreTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const task = await taskService.restoreTask((req.params.id as string), workspaceId, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    console.error("Task Controller Error:", error); return res.status(500).json({ message: 'Internal server error' });
  }
};

// force reload

// reload again





export const rebalanceTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    await taskService.rebalanceTasks(workspaceId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
