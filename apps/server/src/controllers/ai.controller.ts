import { kramaAiService } from '../services/krama-ai.service';

export const kramaChat = async (req: any, res: any) => {
  try {
    const { message, ragEnabled } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    const userId = req.user?.id || 'system';

    if (!message) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Message is required' });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Workspace ID is required' });
    }

    const response = await kramaAiService.askKrama(message, workspaceId, userId, ragEnabled);
    return res.json(response);
  } catch (error) {
    console.error('KRAMA AI ERROR:', error);
    return res.status(500).json({ success: false, message: 'AI request failed' });
  }
};

import type { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { getEmbedding } from '../lib/embedding';
import { redisService } from '../services/redis.service';
import { vectorSearch, keywordSearch, mergeAndRank } from '../services/rag/retriever';

const KRAMA_SYSTEM_PROMPT = `You are KRAMA AI, an intelligent productivity assistant.
Your job is to help the user think, plan, execute, and reflect.

RESPONSE RULES:
1. Be concise by default.
2. Answer the user's actual question first.
3. Do not repeat the user's question.
4. Do not add unnecessary introductions or conclusions.
5. Adapt the response format to the user's intent.

FORMAT BY INTENT:
Simple question: Give a direct answer in 1–4 sentences.
Technical question: Answer, Why, Implementation/next step. (Include code only when useful)
Problem/debugging: Problem, Root cause, Fix, Verification.
Planning: Goal, Priorities, Steps, Next action.
Decision: Recommendation, Why, Trade-offs.
Analysis: Key finding, Evidence, Implication, Recommendation.

When the user asks for code: Provide production-quality code. Explain only the important parts.
When using retrieved knowledge: Answer using the retrieved context. Do not invent information. Mention uncertainty when context is insufficient.

FORMATTING:
- Use Markdown.
- Prefer short paragraphs.
- Use bullets for multiple items.
- Use numbered lists for sequences.
- Use tables only when comparison genuinely benefits from one.
- Use headings only when they improve readability.
- Avoid excessive emojis.
- Never use "Sure!", "Absolutely!", or generic filler unless conversationally appropriate.

IMPORTANT: Do not force every response into a template. The response should feel natural and context-aware.`;

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
      finalPrompt = KRAMA_SYSTEM_PROMPT + '\n\n' + contextStr + strippedPrompt;
    } else {
      finalPrompt = KRAMA_SYSTEM_PROMPT + '\n\n' + prompt;
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
  
  if (process.env.GEMINI_API_KEY) {
    provider = 'gemini';
    model = 'gemini-1.5-flash';
  } else if (!process.env.GROQ_API_KEY && process.env.OPENAI_API_KEY) {
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

    // 1. Generate query embedding
    const queryVector = await getEmbedding(prompt);

    // 2. Retrieve candidates (Hybrid)
    const vectorResults = await vectorSearch(workspaceId, queryVector, 20);
    const keywordResults = await keywordSearch(workspaceId, prompt, 20);

    // 3. Merge and rank via RRF
    const candidates = mergeAndRank(vectorResults, keywordResults);
    
    // 4. Rerank (take top 8)
    const relevantChunks = candidates.slice(0, 8);

    // 5. Gather structured context (Tasks/Goals)
    const activeTasks = await prisma.task.findMany({
      where: { workspaceId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: { title: true, status: true, priority: true, estimateMinutes: true },
      take: 10
    });

    const activeGoals = await prisma.goal.findMany({
      where: { workspaceId, progress: { lt: 100 } },
      select: { title: true, progress: true },
      take: 5
    });

    // 6. Assemble Prompts
    let contextStr = '';
    if (relevantChunks.length > 0) {
      contextStr += '### BRAIN WORKSPACE NOTES ###\n';
      contextStr += relevantChunks.map((c, i) => `[SOURCE ${i + 1}] PAGE_ID: ${c.pageId}\n${c.content}`).join('\n\n');
    } else {
      contextStr += '### BRAIN WORKSPACE NOTES ###\nNo relevant notes found.\n';
    }

    contextStr += '\n\n### ACTIVE TASKS ###\n';
    contextStr += activeTasks.length > 0 ? activeTasks.map(t => `- ${t.title} [${t.status}] (${t.priority})`).join('\n') : 'No active tasks.';

    contextStr += '\n\n### ACTIVE GOALS ###\n';
    contextStr += activeGoals.length > 0 ? activeGoals.map(g => `- ${g.title} [${g.progress}%]`).join('\n') : 'No active goals.';

    const systemPrompt = `${KRAMA_SYSTEM_PROMPT}

You are answering questions using the user's private KRAMA knowledge base and structured project context.

Rules:
1. Use the provided sources when answering knowledge-base questions.
2. Never invent information that is not supported by the sources.
3. If the sources do not contain the answer, say so.
4. Cite the source pages used in your answer like [SOURCE X].
5. Do not expose internal database IDs unless necessary.
6. Use the Active Tasks and Active Goals context to help answer productivity questions.

Knowledge Base and Context:
${contextStr}

User question: ${prompt}`;

    // 7. Call existing complete (which uses Gemini or defaults)
    const answer = await aiService.complete({
      prompt: systemPrompt,
      workspaceId,
      userId: req.user!.id,
      provider: req.body.provider,
      model: req.body.model,
    });

    // We can fetch the actual Page titles for the sources
    const pageIds = [...new Set(relevantChunks.map(c => c.pageId))];
    const pages = await prisma.page.findMany({
      where: { id: { in: pageIds } },
      select: { id: true, title: true }
    });
    
    const sources = relevantChunks.map(c => {
      const page = pages.find(p => p.id === c.pageId);
      return { id: c.pageId, title: page?.title || 'Unknown Page', chunkId: c.id };
    });

    return res.status(200).json({ 
      completion: answer, 
      sources: sources
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

