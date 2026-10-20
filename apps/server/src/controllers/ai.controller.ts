import { kramaAiService } from '../services/krama-ai.service';
import type { Request, Response } from 'express';
import { aiService, getTextConfiguration } from '../services/ai.service';
import { prisma } from '../prisma';
import { redisService } from '../services/redis.service';
import { z } from 'zod';
import { AppError, handleControllerError } from '../utils/errors';
import { logger } from '../utils/logger';

const ChatInput = z.object({
  message: z.string().trim().max(20000).optional(),
  prompt: z.string().trim().max(20000).optional(),
  ragEnabled: z.boolean().optional(),
}).refine(value => Boolean(value.message || value.prompt), { message: 'Message is required', path: ['message'] });

const TelemetryInput = z.object({
  mood: z.string().trim().max(200).optional(),
  energy: z.string().trim().max(200).optional(),
  reflection: z.string().trim().max(20000).optional(),
  sessionSeconds: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  wins: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
});

export const kramaChat = async (req: Request, res: Response) => {
  try {
    const input = ChatInput.parse(req.body);
    const message = input.message || input.prompt;
    const { ragEnabled } = input;
    const workspaceId = req.workspaceId;
    const userId = req.user!.id;

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
    return handleControllerError(res, error, 'AI request failed');
  }
};

export const getUsage = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
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
  } catch (error) {
    return handleControllerError(res, error);
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
  let reservedQuotaKey: string | undefined;
  let generated = false;
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    const force = z.enum(['true', 'false']).optional().parse(req.query.force) === 'true';
    const cacheKey = `ai:dashboard_insight:${workspaceId}`;

    if (!force) {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return res.status(200).json({ insight: cached });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const rateLimitKey = `ai_insight_generation_count:${req.user!.id}:${today}`;
    let reserved: boolean;
    try { reserved = await redisService.reserveDailyAllowance(rateLimitKey, 3, 24 * 60 * 60); }
    catch { throw new AppError('AI insights are temporarily unavailable. Please try again shortly.', 503, 'AI_QUOTA_UNAVAILABLE'); }
    if (!reserved) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You have reached the daily limit (3) for generating AI dashboard insights.',
      });
    }
    reservedQuotaKey = rateLimitKey;

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

    generated = true;
    // Overwrite the cache. Use end of day expiration for this insight cache itself
    await redisService.set(cacheKey, answer, 24 * 60 * 60);

    return res.status(200).json({ insight: answer });
  } catch (error) {
    if (reservedQuotaKey && !generated) {
      try { await redisService.releaseDailyAllowance(reservedQuotaKey); }
      catch { logger.warn('Could not release a failed AI insight reservation.'); }
    }
    return handleControllerError(res, error, 'Unable to generate insight.');
  }
};

export const analyzeTelemetry = async (req: Request, res: Response) => {
  try {
    const input = TelemetryInput.parse(req.body);
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    const { mood, energy, reflection, sessionSeconds, wins } = input;

    const contextStr = await aiService.buildWorkspaceContext(workspaceId);

    const telemetryPrompt = `You are the AI Sunset Sentinel for Krama OS, an execution and productivity platform.
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
  } catch (error) {
    return handleControllerError(res, error, 'Unable to generate telemetry insight.');
  }
};

