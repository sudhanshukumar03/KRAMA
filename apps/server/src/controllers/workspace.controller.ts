import type { Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service';

export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    const workspaces = await workspaceService.listWorkspaces(req.user!.id);
    return res.status(200).json(workspaces);
  } catch (error) {
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
    // @ts-ignore
    const workspace = await workspaceService.createWorkspace(req.body, req.user!.id);
    return res.status(201).json(workspace);
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const workspace = await workspaceService.updateWorkspace(req.params.id as string, req.body);
    return res.status(200).json(workspace);
  } catch (error: any) {
    if (error.message === 'Workspace not found') return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id as string);
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
