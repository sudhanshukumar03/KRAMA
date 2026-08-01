// @ts-nocheck
import type { Request, Response } from 'express';
import { CreateTaskSchema, UpdateTaskSchema, ReorderSchema } from '@krama/validation';
import { taskService } from '../services/task.service';

export const listTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const tasks = await taskService.listTasks(workspaceId, {
      projectId: req.query.projectId as string,
      sprintId: req.query.sprintId as string,
      status: req.query.status as string,
    });
    
    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    const task = await taskService.getTask(req.params.id, workspaceId);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const data = CreateTaskSchema.parse(req.body);
    const task = await taskService.createTask(data, req.user!.id);
    return res.status(201).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const data = UpdateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.params.id, data.workspaceId, data, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    await taskService.deleteTask(req.params.id, workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Task deleted' });
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderTask = async (req: Request, res: Response) => {
  try {
    const data = ReorderSchema.parse(req.body);
    const task = await taskService.reorderTask(req.params.id, data.workspaceId, data, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    const task = await taskService.completeTask(req.params.id, workspaceId, req.user!.id);
    return res.status(200).json(task);
  } catch (error: any) {
    if (error.message === 'Task not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
