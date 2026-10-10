import { kramaAiService } from '../services/krama-ai.service';
import type { Request, Response } from 'express';
import { aiService, getTextConfiguration } from '../services/ai.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { redisService } from '../services/redis.service';

export const kramaChat = async (req: any, res: any) => {
  try {
    const message = req.body.message || req.body.prompt;
    const { ragEnabled } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const userId = req.user?.id || 'system';

    if (!message) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Message is required' });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    if (!getTextConfiguration().available) {
      return res.status(503).json({ success: false, message: 'AI text generation is not configured.' });
    }
    // Match the reported deployment provider; the gateway handles fallback.
    const response = await kramaAiService.askKrama(message, workspaceId, userId, ragEnabled);
    return res.json(response);
  } catch (error) {
    console.error('KRAMA AI ERROR:', error);
    return res.status(500).json({ success: false, message: 'AI request failed' });
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
    logger.error('Error in getUsage', { error: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConfig = async (_req: Request, res: Response) => {
  return res.status(200).json({
    ...getTextConfiguration(),
    ragEnabled: Boolean(process.env.GEMINI_API_KEY),
    memoryEnabled: false
  });
};

export const getDashboardInsight = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    const force = req.query.force === 'true';
    const cacheKey = `ai:dashboard_insight:${workspaceId}`;

    if (!force) {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return res.status(200).json({ insight: cached });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const rateLimitKey = `ai_insight_generation_count:${req.user!.id}:${today}`;
    const countStr = await redisService.get(rateLimitKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= 3) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You have reached the daily limit (3) for generating AI dashboard insights.',
      });
    }

    const contextStr = await aiService.buildWorkspaceContext(workspaceId);
    const prompt = `You are an AI assistant for Krama OS, an execution and productivity platform.
Based on the following workspace context, provide a short 2-3 sentence motivational and strategic insight for the user's dashboard.
Focus on what they should prioritize today based on their active goals and pending tasks.

${contextStr}`;

    const answer = await aiService.complete({
      prompt,
      workspaceId,
      userId: req.user!.id,
    });

    await redisService.set(rateLimitKey, (count + 1).toString(), 24 * 60 * 60);
    // Overwrite the cache. Use end of day expiration for this insight cache itself
    await redisService.set(cacheKey, answer, 24 * 60 * 60);

    return res.status(200).json({ insight: answer });
  } catch (error: any) {
    logger.error('Error in getDashboardInsight', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      code: "AI_PROVIDER_ERROR",
      message: "Unable to generate insight."
    });
  }
};

export const analyzeTelemetry = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    const { mood, energy, reflection, sessionSeconds, wins } = req.body;

    const contextStr = await aiService.buildWorkspaceContext(workspaceId);

    let telemetryPrompt = `You are the AI Sunset Sentinel for Krama OS, an execution and productivity platform.
The user is closing out their work session and has provided the following telemetry data:
- Deep Focus Time Logged: ${Math.floor((sessionSeconds || 0) / 60)} minutes
- Tasks Completed: ${wins || 0}
- End of Session Mood: ${mood || 'Not specified'}
- End of Session Energy: ${energy || 'Not specified'}
- Text Reflection: "${reflection || 'No reflection provided'}"

Workspace Context:
${contextStr}

Based on this telemetry and context, provide a highly tactical, 2-3 sentence debrief. Analyze the correlation between their focus time, mood, and reflection, and suggest what they should prioritize tomorrow morning or how they should recover tonight. Keep it concise, motivational, and highly specific. Ensure your response is completely unique each time by focusing on a different angle of the telemetry data or a unique motivational philosophy. Do not use generic phrases.`;

    const answer = await aiService.complete({
      prompt: telemetryPrompt,
      workspaceId,
      userId: req.user!.id,
    });

    return res.status(200).json({ insight: answer });
  } catch (error: any) {
    logger.error('Error in analyzeTelemetry', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      code: "AI_PROVIDER_ERROR",
      message: "Unable to generate telemetry insight."
    });
  }
};

