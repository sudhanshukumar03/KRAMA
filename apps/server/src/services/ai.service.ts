
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { redisService } from './redis.service';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

export type ProviderType = 'openai' | 'anthropic' | 'groq';

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
      completionText: response.choices[0]?.message?.content || '',
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
      completionText: response.choices[0]?.message?.content || '',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
    };
  }
}

class ProviderFactory {
  static getProvider(provider: ProviderType): AIProvider {
    switch (provider) {
      case 'openai': return new OpenAIProvider();
      case 'anthropic': return new AnthropicProvider();
      case 'groq': return new GroqProvider();
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
    return `Mock generated insight for ${params.userId} in ${params.workspaceId} at ${new Date().toISOString()}`;
  }

  public async buildWorkspaceContext(workspaceId: string): Promise<string> {
    return "Mock workspace context";
  }
}

export const aiService = new AiService();
