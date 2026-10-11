import type { Request, Response } from 'express';
import { z } from 'zod';
import { workspaceService } from '../services/workspace.service';

// Whitelist user-settable fields so callers can't mass-assign protected columns
// (createdBy, deletedAt, productivityScore, version, ...).
const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.any()).optional(),
});
const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial();

export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    const workspaces = await workspaceService.listWorkspaces(req.user!.id);
    return res.status(200).json(workspaces);
  } catch (error) {
    console.error('[WorkspaceController] listWorkspaces error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkspace = async (req: Request, res: Response) => {
  try {
    const workspace = await workspaceService.getWorkspace(req.params.id as string);
    return res.status(200).json(workspace);
  } catch (error: any) {
    if (error.message === 'Workspace not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const parsed = CreateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid workspace payload', errors: parsed.error.flatten() });
    }
    const workspace = await workspaceService.createWorkspace(parsed.data, req.user!.id);
    return res.status(201).json(workspace);
  } catch (error: any) {
    console.error('[WorkspaceController] createWorkspace error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const parsed = UpdateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid workspace payload', errors: parsed.error.flatten() });
    }
    const workspace = await workspaceService.updateWorkspace(req.params.id as string, parsed.data);
    return res.status(200).json(workspace);
  } catch (error: any) {
    if (error.message === 'Workspace not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id as string, req.user!.id);
    return res.status(200).json({ message: 'Workspace deleted' });
  } catch (error: any) {
    if (error.message === 'Workspace not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const exportWorkspace = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = await workspaceService.exportWorkspace(workspaceId);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error.message === 'Workspace not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
