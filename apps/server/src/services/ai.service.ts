
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { redisService } from './redis.service';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

export type ProviderType = 'openai' | 'anthropic' | 'groq' | 'gemini';

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

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  constructor() {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  async complete(prompt: string, model: string): Promise<ProviderResponse> {
    const response = await this.client.messages.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });
    return {
      completionText: (response.content[0] as any)?.text || '',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    };
  }
}

class GroqProvider implements AIProvider {
  private client: OpenAI;
  constructor() {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");
    this.client = new OpenAI({ 
      baseURL: 'https://api.groq.com/openai/v1',
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

import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  constructor() {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  async complete(prompt: string, model: string): Promise<ProviderResponse> {
    const geminiModel = this.client.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    
    // Estimate tokens since Gemini SDK doesn't return exact token counts in the same format
    // A rough heuristic is ~4 characters per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionText = result.response.text();
    const completionTokens = Math.ceil(completionText.length / 4);

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
      case 'openai': return new OpenAIProvider();
      case 'anthropic': return new AnthropicProvider();
      case 'groq': return new GroqProvider();
      case 'gemini': return new GeminiProvider();
      default: throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

const COST_MAP: Record<string, { prompt: number, completion: number }> = {
  'gpt-4o-mini': { prompt: 0.15 / 1_000_000, completion: 0.60 / 1_000_000 },
  'gpt-3.5-turbo': { prompt: 0.50 / 1_000_000, completion: 1.50 / 1_000_000 },
  'claude-3-haiku-20240307': { prompt: 0.25 / 1_000_000, completion: 1.25 / 1_000_000 },
  'llama-3.1-8b-instant': { prompt: 0.05 / 1_000_000, completion: 0.08 / 1_000_000 },
  'llama-3.1-70b-versatile': { prompt: 0.59 / 1_000_000, completion: 0.79 / 1_000_000 },
  'gemini-1.5-flash-latest': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
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
      else if (activeProvider === 'openai') activeModel = 'gpt-4o-mini';
      else if (activeProvider === 'anthropic') activeModel = 'claude-3-haiku-20240307';
      else if (activeProvider === 'groq') activeModel = 'qwen/qwen3.6-27b';
    }
    
    // If neither is provided, fallback based on available environment variables
    if (!activeProvider || !activeModel) {
      if (process.env.GROQ_API_KEY) {
          activeProvider = 'groq';
          activeModel = 'qwen/qwen3.6-27b';
        } else if (process.env.GEMINI_API_KEY) {
        activeProvider = 'gemini';
        activeModel = 'gemini-1.5-flash-latest';
      } else if (!process.env.GROQ_API_KEY && process.env.OPENAI_API_KEY) {
        activeProvider = 'openai';
        activeModel = 'gpt-4o-mini';
      } else if (!process.env.GROQ_API_KEY && process.env.ANTHROPIC_API_KEY) {
        activeProvider = 'anthropic';
        activeModel = 'claude-3-haiku-20240307';
      } else {
        activeProvider = 'groq';
        activeModel = 'qwen/qwen3.6-27b';
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




