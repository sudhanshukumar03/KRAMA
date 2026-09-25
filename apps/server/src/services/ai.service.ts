
import Groq from 'groq-sdk';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

type ProviderType = 'groq' | 'gemini';

interface AiCompleteParams {
  prompt: string;
  model?: string;
  provider?: ProviderType;
  workspaceId: string;
  userId: string;
}

interface ProviderResponse {
  completionText: string;
  promptTokens: number;
  completionTokens: number;
}

interface AIProvider {
  complete(prompt: string, model: string): Promise<ProviderResponse>;
}



class GroqProvider implements AIProvider {
  private client: Groq;
  constructor() {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  async complete(prompt: string, model: string): Promise<ProviderResponse> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    return {
      completionText: (response.choices[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
    };
  }
}

import { GoogleGenAI } from '@google/genai';

let geminiClientInstance: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClientInstance) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    geminiClientInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClientInstance;
}

class GeminiProvider implements AIProvider {
  private get client(): GoogleGenAI {
    return getGeminiClient();
  }
  async complete(prompt: string, model: string): Promise<ProviderResponse> {
    const response = await this.client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const completionText = response.text || '';
    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
    const completionTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(completionText.length / 4);

    return {
      completionText,
      promptTokens,
      completionTokens,
    };
  }
}

class ProviderFactory {
  static getProvider(provider: ProviderType): AIProvider {
    switch (provider) {
      case 'groq': return new GroqProvider();
      case 'gemini': return new GeminiProvider();
      default: throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const GROQ_MODEL = 'openai/gpt-oss-20b';

const COST_MAP: Record<string, { prompt: number, completion: number }> = {
  'openai/gpt-oss-20b': { prompt: 0.05 / 1_000_000, completion: 0.08 / 1_000_000 },
  'llama-3.1-8b-instant': { prompt: 0.05 / 1_000_000, completion: 0.08 / 1_000_000 },
  'llama-3.1-70b-versatile': { prompt: 0.59 / 1_000_000, completion: 0.79 / 1_000_000 },
  'gemini-3.8-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
  'gemini-2.5-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
  'gemini-2.0-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
};


class AiService {
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const rates = COST_MAP[model] || { prompt: 0, completion: 0 };
    return (promptTokens * rates.prompt) + (completionTokens * rates.completion);
  }

  private async executeWithRetry(providerInstance: AIProvider, prompt: string, model: string, maxRetries = 1): Promise<ProviderResponse> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await providerInstance.complete(prompt, model);
      } catch (error: any) {
        lastError = error;
        const status = error.status || error.response?.status;
        if (status === 429 || (status >= 500 && status < 600)) {
          if (attempt < maxRetries) {
            logger.warn(`Provider error (${status}), retrying...`, { attempt: attempt + 1, model });
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // simple backoff
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }

  public async complete(params: AiCompleteParams): Promise<string> {
    const startTime = Date.now();
    let activeProvider = params.provider;
    let activeModel = params.model;

    // If provider is provided but model is not, set default model for that provider
    if (activeProvider && !activeModel) {
      if (activeProvider === 'gemini') activeModel = GEMINI_MODEL;
      else if (activeProvider === 'groq') activeModel = GROQ_MODEL;
    }

    // If neither is provided, fallback based on available environment variables
    if (!activeProvider || !activeModel) {
      if (process.env.GEMINI_API_KEY) {
        activeProvider = 'gemini';
        activeModel = GEMINI_MODEL;
      } else if (process.env.GROQ_API_KEY) {
        activeProvider = 'groq';
        activeModel = GROQ_MODEL;
      } else {
        activeProvider = 'gemini';
        activeModel = GEMINI_MODEL;
      }
    }

    let response: ProviderResponse;
    try {
      const providerInstance = ProviderFactory.getProvider(activeProvider);
      response = await this.executeWithRetry(providerInstance, params.prompt, activeModel);
    } catch (primaryError: any) {
      logger.warn(`Primary AI provider ${activeProvider} (${activeModel}) failed: ${primaryError.message}. Attempting fallback...`);
      if (activeProvider === 'gemini' && process.env.GROQ_API_KEY) {
        try {
          const fallbackProvider = ProviderFactory.getProvider('groq');
          activeProvider = 'groq';
          activeModel = GROQ_MODEL;
          response = await this.executeWithRetry(fallbackProvider, params.prompt, activeModel);
        } catch (fallbackErr: any) {
          logger.error(`Fallback provider groq also failed: ${fallbackErr.message}`);
          throw primaryError;
        }
      } else if (activeProvider === 'groq' && process.env.GEMINI_API_KEY) {
        try {
          const fallbackProvider = ProviderFactory.getProvider('gemini');
          activeProvider = 'gemini';
          activeModel = GEMINI_MODEL;
          response = await this.executeWithRetry(fallbackProvider, params.prompt, activeModel);
        } catch (fallbackErr: any) {
          logger.error(`Fallback provider gemini also failed: ${fallbackErr.message}`);
          throw primaryError;
        }
      } else {
        throw primaryError;
      }
    }
    const latencyMs = Date.now() - startTime;

    const estimatedCostUsd = this.calculateCost(activeModel, response.promptTokens, response.completionTokens);

    await prisma.aiRequest.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        prompt: params.prompt,
        response: response.completionText,
        model: activeModel,
        provider: activeProvider,
        tokensUsed: response.promptTokens + response.completionTokens,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        estimatedCostUsd,
        latencyMs,
        cacheHit: false
      }
    });

    return response.completionText;
  }

  public async interactWithGemini(params: {
    input: string;
    model?: string;
    workspaceId: string;
    userId: string;
  }): Promise<string> {
    const startTime = Date.now();
    const model = params.model || GEMINI_MODEL;
    const client = getGeminiClient();

    let completionText = '';
    let success = false;
    let lastError: any = null;

    // Retry loop with backoff (handles temporary 503 high demand or 429)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const interaction = await client.interactions.create({
          model,
          input: params.input,
        });
        completionText = interaction.output_text || '';
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode || err.response?.status;
        if (status === 503 || status === 429) {
          logger.warn(`Gemini interaction ${status}, retrying in 1s...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }

    // Fallback to Groq if Gemini is temporarily unavailable
    if (!success) {
      if (process.env.GROQ_API_KEY) {
        logger.warn('Gemini unavailable, falling back to Groq for interaction');
        return this.complete({
          prompt: params.input,
          provider: 'groq',
          model: GROQ_MODEL,
          workspaceId: params.workspaceId,
          userId: params.userId,
        });
      }
      throw lastError;
    }

    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.ceil(params.input.length / 4);
    const completionTokens = Math.ceil(completionText.length / 4);
    const estimatedCostUsd = this.calculateCost(model, promptTokens, completionTokens);

    await prisma.aiRequest.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        prompt: params.input,
        response: completionText,
        model,
        provider: 'gemini',
        tokensUsed: promptTokens + completionTokens,
        promptTokens,
        completionTokens,
        estimatedCostUsd,
        latencyMs,
        cacheHit: false,
      },
    });

    return completionText;
  }

  public async generateContentWithGemini(params: {
    prompt: string;
    model?: string;
    config?: any;
    workspaceId: string;
    userId: string;
  }): Promise<{ text: string }> {
    const startTime = Date.now();
    const model = params.model || GEMINI_MODEL;
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model,
      contents: params.prompt,
      config: params.config,
    });

    const completionText = response.text || '';
    const latencyMs = Date.now() - startTime;
    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(params.prompt.length / 4);
    const completionTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(completionText.length / 4);
    const estimatedCostUsd = this.calculateCost(model, promptTokens, completionTokens);

    await prisma.aiRequest.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        prompt: params.prompt,
        response: completionText,
        model,
        provider: 'gemini',
        tokensUsed: promptTokens + completionTokens,
        promptTokens,
        completionTokens,
        estimatedCostUsd,
        latencyMs,
        cacheHit: false,
      },
    });

    return { text: completionText };
  }

  public async buildWorkspaceContext(workspaceId: string): Promise<string> {
    const now = new Date();
    const activeSprint = await prisma.sprint.findFirst({
      where: { workspaceId, startDate: { lte: now }, endDate: { gte: now } }
    });

    const activeGoals = await prisma.goal.findMany({
      where: { workspaceId, progress: { lt: 100 }, deletedAt: null }
    });

    const openTasks = await prisma.task.findMany({
      where: { workspaceId, status: { notIn: ['DONE', 'CANCELED'] }, deletedAt: null },
      take: 15,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
    });

    let contextStr = "--- WORKSPACE CONTEXT ---\n";

    if (activeSprint) {
      contextStr += `Current Sprint: "${activeSprint.name}"\n`;
    }

    if (activeGoals.length > 0) {
      contextStr += `Active Goals:\n` + activeGoals.map(g => `- ${g.title} (${g.progress}% complete)`).join('\n') + '\n';
    }

    if (openTasks.length > 0) {
      contextStr += `Open Tasks:\n` + openTasks.map(t => `- ${t.title} (${t.status}, ${t.priority} priority)`).join('\n') + '\n';
    }

    return contextStr;
  }
}

export const aiService = new AiService();




