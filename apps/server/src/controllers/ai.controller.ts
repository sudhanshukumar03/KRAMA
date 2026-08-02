import type { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { getEmbedding } from '../lib/embedding';

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

    const completion = await aiService.complete({
      prompt,
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
