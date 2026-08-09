import type { Request, Response } from 'express';
import { CreateHabitSchema, UpdateHabitSchema } from '@krama/validation';
import { habitService } from '../services/habit.service';

export const listHabits = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const habits = await habitService.listHabits(workspaceId as string);
    return res.status(200).json(habits);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const habit = await habitService.getHabit(req.params.id as string, workspaceId);
    return res.status(200).json(habit);
  } catch (error: any) {
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const data = CreateHabitSchema.parse({ ...req.body, workspaceId });
    // @ts-ignore
    const habit = await habitService.createHabit(data, req.user!.id);
    return res.status(201).json(habit);
  } catch (error: any) {
    console.error('Habit Create Error:', error);
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const data = UpdateHabitSchema.parse({ ...req.body, workspaceId });
    // @ts-ignore
    const habit = await habitService.updateHabit(req.params.id as string, data.workspaceId, data, req.user!.id);
    return res.status(200).json(habit);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    // @ts-ignore
    await habitService.deleteHabit(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Habit deleted' });
  } catch (error: any) {
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.body.workspaceId) as string;
    // @ts-ignore
    const habit = await habitService.logHabitCompletion(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json(habit);
  } catch (error: any) {
    console.error('logHabit error:', error);
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    if (error.message === 'Habit already logged for today') return res.status(400).json({ message: error.message });
    if (error.message === 'Habit not scheduled for today') return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStreak = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const data = await habitService.getStreak(req.params.id as string, workspaceId);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const restoreHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const habit = await habitService.restoreHabit(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json(habit);
  } catch (error: any) {
    if (error.message === 'Habit not found') return res.status(404).json({ message: error.message });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
