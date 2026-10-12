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
    console.error('listGoals Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const listGoalsLite = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const goals = await goalService.listGoalsLite(workspaceId);
    return res.status(200).json(goals);
  } catch (error) {
    console.error('listGoalsLite Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const goal = await goalService.getGoal(req.params.id as string, workspaceId);
    return res.status(200).json(goal);
  } catch (error: any) {
    if (error.message === 'Goal not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateGoalSchema.parse({ ...req.body, workspaceId });
    const { skillIds: _skillIds, color, ...cleanData } = data as any;
    let metadata = cleanData.metadata || {};
    if (color !== undefined) metadata.color = color;
    if (Object.keys(metadata).length > 0) cleanData.metadata = metadata;
    // @ts-ignore
    const goal = await goalService.createGoal(cleanData, req.user!.id);
    return res.status(201).json(goal);
  } catch (error: any) {
    console.error('Goal Create Error:', error);
    if (error.message?.startsWith('Invalid ')) return res.status(400).json({ message: error.message });
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string; if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' }); const data = UpdateGoalSchema.parse(req.body);
    const { skillIds: _skillIds, color, ...cleanData } = data as any;
    if (color !== undefined) {
      cleanData.metadata = { ...cleanData.metadata, color };
    }
    // `note` is a transient per-update check-in note (written onto today's snapshot,
    // not persisted on the goal). It isn't part of UpdateGoalSchema, so read it off the
    // raw body — avoids a shared-schema change (and package rebuild) for one throwaway field.
    const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim() : undefined;
    if (note) cleanData.note = note;
    // @ts-ignore
    const goal = await goalService.updateGoal(req.params.id as string, workspaceId, cleanData, req.user!.id);
    return res.status(200).json(goal);
  } catch (error: any) {
    if (error.message?.startsWith('Invalid ')) return res.status(400).json({ message: error.message });
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    if (error.message === 'Goal not found') return res.status(404).json({ message: error.message });
    if (error.code === 'P2025') return res.status(409).json({ message: 'Conflict: version mismatch' });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    // @ts-ignore
    await goalService.deleteGoal(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json({ message: 'Goal deleted' });
  } catch (error: any) {
    if (error.message === 'Goal not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const restoreGoal = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const goal = await goalService.restoreGoal(req.params.id as string, workspaceId, req.user!.id);
    return res.status(200).json(goal);
  } catch (error: any) {
    if (error.message === 'Goal not found') return res.status(404).json({ message: error.message });
    if (error.code === 'P2025') return res.status(409).json({ message: 'Conflict: version mismatch' });
    if (error.message.includes('Conflict')) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
