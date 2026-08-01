// @ts-nocheck
import type { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const completeAiRequest = async (req: Request, res: Response) => {
  try {
    const { prompt, model, provider } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const completion = await aiService.complete({
      prompt,
      model,
      provider,
      workspaceId,
      userId: req.user!.id,
    });

    return res.status(200).json({ completion });
  } catch (error: any) {
    console.error('[AI Gateway] Error in completeAiRequest:', error.message);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const getUsage = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const usage = await prisma.aiRequest.aggregate({
      where: { workspaceId },
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        estimatedCostUsd: true,
      },
    });

    return res.status(200).json({
      totalRequests: usage._count.id,
      promptTokens: usage._sum.promptTokens || 0,
      completionTokens: usage._sum.completionTokens || 0,
      estimatedCostUsd: usage._sum.estimatedCostUsd || 0,
    });
  } catch (error: any) {
    console.error('[AI Gateway] Error in getUsage:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
