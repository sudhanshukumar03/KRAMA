import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

const RANGES = ['7d', '30d', '90d'] as const;

export const getOverview = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const range = (req.query.range as any) || '7d';
    if (!RANGES.includes(range)) return res.status(400).json({ message: 'Invalid range' });
    
    const data = await analyticsService.getOverview(workspaceId, range);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getOverview error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFocusHistory = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const range = (req.query.range as any) || '7d';
    if (!RANGES.includes(range)) return res.status(400).json({ message: 'Invalid range' });
    
    const data = await analyticsService.getFocusHistory(workspaceId, range);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getFocusHistory error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
