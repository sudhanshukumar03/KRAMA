import type { Request, Response } from 'express';
import { z } from 'zod';
import { workspaceService } from '../services/workspace.service';
import { restoreWorkspaceBackup } from '../services/workspaceRestore.service';
import { workspaceSummary } from '../services/workspaceRead.service';
import { handleControllerError } from '../utils/errors';

export async function getWorkspaceSummary(req: Request, res: Response) {
  if (!req.workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  try { return res.json(await workspaceSummary(req.workspaceId)); }
  catch (error) { return handleControllerError(res, error, 'Could not load workspace counts'); }
}

// Whitelist user-settable fields so callers can't mass-assign protected columns
// (createdBy, deletedAt, productivityScore, version, ...).
const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.json()).optional(),
});
const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial();

export async function restoreWorkspace(req: Request, res: Response) {
  try {
    const workspace = await restoreWorkspaceBackup(req.body, req.user!.id);
    return res.status(201).json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: `Invalid personal backup: ${error.issues[0]?.message || 'check the file format.'}` });
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'P2002' || code === 'P2003') return res.status(400).json({ message: 'The backup contains duplicate or missing relationships. Nothing was restored.' });
    return handleControllerError(res, error, 'Restore failed. No partial workspace was kept. Try again.');
  }
}

export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    const workspaces = await workspaceService.listWorkspaces(req.user!.id);
    return res.status(200).json(workspaces);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getWorkspace = async (req: Request, res: Response) => {
  try {
    const workspace = await workspaceService.getWorkspace(req.params.id as string);
    return res.status(200).json(workspace);
  } catch (error) {
    return handleControllerError(res, error);
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
  } catch (error) {
    return handleControllerError(res, error);
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
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id as string, req.user!.id);
    return res.status(200).json({ message: 'Workspace deleted' });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const exportWorkspace = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = await workspaceService.exportWorkspace(workspaceId);
    return res.status(200).json(data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};
