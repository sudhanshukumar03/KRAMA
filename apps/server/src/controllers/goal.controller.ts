import { handleControllerError } from '../utils/errors';
import type { Request, Response } from 'express';
import { CreateGoalSchema, UpdateGoalSchema } from '@krama/validation';
import { goalService } from '../services/goal.service';

export const listGoals = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const goals = await goalService.listGoals(workspaceId);
    return res.status(200).json(goals);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const listGoalsLite = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const goals = await goalService.listGoalsLite(workspaceId);
    return res.status(200).json(goals);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const getGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const goal = await goalService.getGoal(req.params.id as string, workspaceId);
    return res.status(200).json(goal);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateGoalSchema.parse({ ...req.body, workspaceId });
    const { skillIds: _skillIds, ...cleanData } = data;
    const goal = await goalService.createGoal(cleanData, req.user!.id);
    return res.status(201).json(goal);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string; if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' }); const data = UpdateGoalSchema.parse(req.body);
    const { skillIds: _skillIds, ...parsed } = data;
    const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim() : undefined;
    const cleanData = { ...parsed, ...(note ? { note } : {}) };
    const goal = await goalService.updateGoal(req.params.id as string, workspaceId, cleanData, req.user!.id);
    return res.status(200).json(goal);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error', { conflictOnMissingRecord: true });
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    await goalService.deleteGoal(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Goal deleted' });
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error');
  }
};

export const restoreGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const goal = await goalService.restoreGoal(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json(goal);
  } catch (error) {
    return handleControllerError(res, error, 'Internal server error', { conflictOnMissingRecord: true });
  }
};
