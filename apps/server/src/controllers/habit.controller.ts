import { handleControllerError } from '../utils/errors';
import type { Request, Response } from 'express';
import { CreateHabitSchema, UpdateHabitSchema, HabitLogSchema } from '@krama/validation';
import { habitService } from '../services/habit.service';

export const listHabits = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    if (req.query.view !== undefined && req.query.view !== 'tracker') return res.status(400).json({ message: 'Invalid habit view' });
    const habits = await habitService.listHabits(workspaceId as string, req.user!.id, req.get('x-timezone'), req.query.view === 'tracker' ? 'tracker' : 'full');
    return res.status(200).json(habits);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const getHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const habit = await habitService.getHabit(req.params.id as string, workspaceId, req.user!.id, req.get('x-timezone'));
    return res.status(200).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const createHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const data = CreateHabitSchema.parse({ ...req.body, workspaceId });
    const habit = await habitService.createHabit(data, req.user!.id);
    return res.status(201).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const updateHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    const data = UpdateHabitSchema.parse({ ...req.body, workspaceId });
    const habit = await habitService.updateHabit(req.params.id as string, workspaceId, data, req.user!.id);
    return res.status(200).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error', { conflictOnMissingRecord: true });
  }
};

export const deleteHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    await habitService.deleteHabit(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Habit deleted' });
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const logHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.body.workspaceId) as string;
    const { date, dateIso } = HabitLogSchema.parse(req.body);
    const habit = await habitService.logHabitCompletion(req.params.id as string, workspaceId, req.user!.id, date, dateIso, req.get('x-timezone'));
    return res.status(200).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const unlogHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.body.workspaceId || req.query.workspaceId) as string;
    // The unlog endpoint may carry the target day in the body (web) or the query
    // string (planner DELETE); merge both before validating. The web client
    // always sends `?date=&dateIso=`, so drop empty strings rather than let the
    // YYYY-MM-DD / datetime validators reject them.
    const rawLog: Record<string, unknown> = { ...req.query, ...req.body };
    if (rawLog.date === '') delete rawLog.date;
    if (rawLog.dateIso === '') delete rawLog.dateIso;
    const { date, dateIso } = HabitLogSchema.parse(rawLog);
    const habit = await habitService.unlogHabitCompletion(req.params.id as string, workspaceId, req.user!.id, date, dateIso, req.get('x-timezone'));
    return res.status(200).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const getStreak = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const data = await habitService.getStreak(req.params.id as string, workspaceId, req.user!.id, req.get('x-timezone'));
    return res.status(200).json(data);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const restoreHabit = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const habit = await habitService.restoreHabit(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json(habit);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error', { conflictOnMissingRecord: true });
  }
};
