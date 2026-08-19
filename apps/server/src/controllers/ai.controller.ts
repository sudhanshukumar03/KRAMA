import type { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { getEmbedding } from '../lib/embedding';
import { redisService } from '../services/redis.service';

export const completeAiRequest = async (req: Request, res: Response) => {
  try {
    const { prompt, model, provider } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!prompt) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Prompt is required' });
    }

    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    let finalPrompt = prompt;

    if (prompt.includes('@project')) {
      const now = new Date();
      const activeSprint = await prisma.sprint.findFirst({
        where: {
          workspaceId,
          startDate: { lte: now },
          endDate: { gte: now }
        }
      });

      const activeGoals = await prisma.goal.findMany({
        where: {
          workspaceId,
          status: { not: 'COMPLETED' }
        }
      });

      const openTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          assigneeId: req.user!.id,
          status: { notIn: ['DONE', 'CANCELED'] }
        },
        take: 15,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ],
        include: {
          blockedBy: {
            select: { title: true }
          }
        }
      });

      let contextStr = '<system_project_context>\n';
      contextStr += "The user has invoked the @project command. Use the following real-time data from their workspace to inform your answer:\n\n";
      
      if (activeSprint) {
        contextStr += `# Current Sprint: "${activeSprint.name}" (${activeSprint.startDate.toISOString().split('T')[0]} - ${activeSprint.endDate.toISOString().split('T')[0]})\n`;
      } else {
        contextStr += `# Current Sprint: None active\n`;
      }
      contextStr += '\n';

      if (activeGoals.length > 0) {
        contextStr += `# Active Goals:\n`;
        activeGoals.forEach((g, i) => {
          contextStr += `${i + 1}. ${g.title} (${g.progress}% complete)\n`;
        });
      } else {
        contextStr += `# Active Goals: None\n`;
      }
      contextStr += '\n';

      if (openTasks.length > 0) {
        contextStr += `# Open Tasks:\n`;
        openTasks.forEach(t => {
          const blockedStr = t.blockedBy ? `Blocked by: ${t.blockedBy.title}` : `Blocked by: None`;
          contextStr += `- ${t.title} (${t.status}, ${t.priority} Priority, ${blockedStr})\n`;
        });
      } else {
        contextStr += `# Open Tasks: None\n`;
      }
      
      contextStr += '</system_project_context>\n\n';
      
      const strippedPrompt = prompt.replace('@project', '').trim();
      finalPrompt = contextStr + strippedPrompt;
    }

    const completion = await aiService.complete({
      prompt: finalPrompt,
      model,
      provider,
      workspaceId,
      userId: req.user!.id,
    });

    return res.status(200).json({ completion });
  } catch (error: any) {
    logger.error('Error in completeAiRequest', { error: error.message, stack: error.stack });
    return res.status(500).json({ 
      success: false, 
      code: "AI_PROVIDER_ERROR", 
      message: "Unable to generate a response." 
    });
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

export const getConfig = async (req: Request, res: Response) => {
  // Return the active configuration dynamically based on the environment
  let provider = 'groq';
  let model = 'llama-3.1-8b-instant';
  
  if (!process.env.GROQ_API_KEY && process.env.OPENAI_API_KEY) {
    provider = 'openai';
    model = 'gpt-4o-mini';
  } else if (!process.env.GROQ_API_KEY && process.env.ANTHROPIC_API_KEY) {
    provider = 'anthropic';
    model = 'claude-3-haiku-20240307';
  }

  return res.status(200).json({
    provider,
    model,
    ragEnabled: true,
    memoryEnabled: false
  });
};

export const ragQuery = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!prompt) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Prompt is required' });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    // 1. Embed query
    const queryVector = await getEmbedding(prompt);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Search pgvector
    type TopPage = { id: string, title: string, content: string };
    const topPages = await prisma.$queryRaw<TopPage[]>`
      SELECT p.id, p.title, p.blocks::text as content
      FROM "Page" p
      JOIN "PageEmbedding" pe ON p.id = pe."pageId"
      WHERE p."workspaceId" = ${workspaceId} AND p."deletedAt" IS NULL
      ORDER BY pe.embedding <-> ${vectorString}::vector
      LIMIT 3
    `;

    // 3. Assemble Prompt
    let contextStr = '';
    if (topPages.length > 0) {
      contextStr = topPages.map(p => `--- PAGE: ${p.title} ---\n${p.content}`).join('\n\n');
    } else {
      contextStr = 'No relevant pages found in this workspace.';
    }

    const augmentedPrompt = `Use the following workspace context to answer the user's question. If the context does not contain the answer, answer to the best of your knowledge but mention that you didn't find it in the user's notes.\n\nContext:\n${contextStr}\n\nQuestion: ${prompt}`;

    // 4. Call existing complete
    const answer = await aiService.complete({
      prompt: augmentedPrompt,
      workspaceId,
      userId: req.user!.id,
    });

    return res.status(200).json({ 
      completion: answer, 
      sources: topPages.map(p => ({ id: p.id, title: p.title })) 
    });
  } catch (error: any) {
    logger.error('Error in ragQuery', { error: error.message, stack: error.stack });
    return res.status(500).json({ 
      success: false, 
      code: "AI_PROVIDER_ERROR", 
      message: "Unable to generate a response." 
    });
  }
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
