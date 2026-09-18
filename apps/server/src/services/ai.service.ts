
import Groq from 'groq-sdk';
import { redisService } from './redis.service';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

export type ProviderType = 'groq' | 'gemini';

export interface AiCompleteParams {
  prompt: string;
  model?: string;
  provider?: ProviderType;
  workspaceId: string;
  userId: string;
}

export interface ProviderResponse {
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

const COST_MAP: Record<string, { prompt: number, completion: number }> = {
  'llama-3.1-8b-instant': { prompt: 0.05 / 1_000_000, completion: 0.08 / 1_000_000 },
  'llama-3.1-70b-versatile': { prompt: 0.59 / 1_000_000, completion: 0.79 / 1_000_000 },
  'gemini-1.5-flash-latest': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
  'gemini-3.6-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
  'gemini-3.7-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
};

export class AiService {
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
      if (activeProvider === 'gemini') activeModel = 'gemini-1.5-flash-latest';
      else if (activeProvider === 'groq') activeModel = 'llama-3.1-8b-instant';
    }
    
    // If neither is provided, fallback based on available environment variables
    if (!activeProvider || !activeModel) {
      if (process.env.GROQ_API_KEY) {
        activeProvider = 'groq';
        activeModel = 'llama-3.1-8b-instant';
      } else if (process.env.GEMINI_API_KEY) {
        activeProvider = 'gemini';
        activeModel = 'gemini-1.5-flash-latest';
      } else {
        activeProvider = 'groq';
        activeModel = 'llama-3.1-8b-instant';
      }
    }
    
    const providerInstance = ProviderFactory.getProvider(activeProvider);
    const response = await this.executeWithRetry(providerInstance, params.prompt, activeModel);
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
    const model = params.model || 'gemini-3.6-flash';
    const client = getGeminiClient();

    const interaction = await client.interactions.create({
      model,
      input: params.input,
    });

    const completionText = interaction.output_text || '';
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
    const model = params.model || 'gemini-3.7-flash';
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




