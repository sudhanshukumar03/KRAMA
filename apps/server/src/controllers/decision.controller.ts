import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { CreateDecisionSchema, UpdateDecisionSchema } from '@krama/validation';

export const listDecisions = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const decisions = await prisma.decision.findMany({
      where: { workspaceId: workspaceId as string },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(decisions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const createDecision = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateDecisionSchema.parse({ ...req.body, workspaceId });
    
    const decision = await prisma.decision.create({
      data: {
        workspaceId: data.workspaceId,
        title: data.title as string,
        rationale: data.rationale as string,
        outcomes: data.outcomes as string,
        options: data.options ? (data.options as any) : [],
        metadata: data.metadata ? (data.metadata as any) : {},
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined
      }
    });

    return res.status(201).json(decision);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Bad request' });
  }
};

export const updateDecision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const decision = await prisma.decision.findFirst({
      where: { id: id as string, workspaceId: workspaceId as string }
    });
    if (!decision) return res.status(404).json({ message: 'Decision not found' });

    const data = UpdateDecisionSchema.parse(req.body);

    const updated = await prisma.decision.update({
      where: { id: id as string },
      data: {
        title: data.title as string,
        rationale: data.rationale as string,
        outcomes: data.outcomes as string,
        options: data.options as any,
        metadata: data.metadata as any,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined
      }
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Bad request' });
  }
};

export const deleteDecision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const decision = await prisma.decision.findFirst({
      where: { id: id as string, workspaceId: workspaceId as string }
    });
    if (!decision) return res.status(404).json({ message: 'Decision not found' });

    await prisma.decision.delete({
      where: { id: id as string }
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};



