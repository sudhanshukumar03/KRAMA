// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { redisService } from './redis.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'mock' });
const groq = new OpenAI({ 
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || 'mock' 
});

type Provider = 'openai' | 'anthropic' | 'groq';

interface AiCompleteParams {
  prompt: string;
  model?: string;
  provider?: Provider;
  workspaceId: string;
  userId: string;
}

// Very simple static cost estimation for demonstration
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

  public async complete(params: AiCompleteParams): Promise<string> {
    const provider = params.provider || 'openai';
    const model = params.model || (provider === 'openai' ? 'gpt-4o-mini' : provider === 'groq' ? 'llama-3.1-8b-instant' : 'claude-3-haiku-20240307');
    
    // 1. Check Cache
    const hashData = JSON.stringify({ provider, model, prompt: params.prompt });
    const cacheKey = `ai:cache:${crypto.createHash('sha256').update(hashData).digest('hex')}`;
    
    const cached = await redisService.get(cacheKey);
    if (cached) {
      // Log cache hit usage
      await prisma.aiRequest.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          provider,
          model,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCostUsd: 0,
          cacheHit: true,
        },
      });
      return cached;
    }

    // 2. Provider execution
    let completionText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock') {
          completionText = 'hello world (mocked)';
          promptTokens = 10;
          completionTokens = 10;
        } else {
          const response = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: params.prompt }],
          });
          completionText = response.choices[0]?.message?.content || '';
          promptTokens = response.usage?.prompt_tokens || 0;
          completionTokens = response.usage?.completion_tokens || 0;
        }
      } else if (provider === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'mock') {
          completionText = 'hello world (mocked)';
          promptTokens = 10;
          completionTokens = 10;
        } else {
          const response = await anthropic.messages.create({
            model,
            messages: [{ role: 'user', content: params.prompt }],
            max_tokens: 4096,
          });
          completionText = (response.content[0] as any)?.text || '';
          promptTokens = response.usage.input_tokens;
          completionTokens = response.usage.output_tokens;
        }
      } else if (provider === 'groq') {
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'mock') {
          completionText = 'hello world (mocked)';
          promptTokens = 10;
          completionTokens = 10;
        } else {
          const response = await groq.chat.completions.create({
            model,
            messages: [{ role: 'user', content: params.prompt }],
          });
          completionText = response.choices[0]?.message?.content || '';
          promptTokens = response.usage?.prompt_tokens || 0;
          completionTokens = response.usage?.completion_tokens || 0;
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (err: any) {
      console.error(`[AI Gateway] Provider error (${provider}/${model}):`, err.message);
      throw new Error(`AI Provider failed: ${err.message}`);
    }

    // 3. Track Usage and Cache Result
    const estimatedCostUsd = this.calculateCost(model, promptTokens, completionTokens);

    await prisma.aiRequest.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        provider,
        model,
        promptTokens,
        completionTokens,
        estimatedCostUsd,
        cacheHit: false,
      },
    });

    // Cache with 1 hour TTL
    await redisService.set(cacheKey, completionText, 60 * 60);

    return completionText;
  }
}

export const aiService = new AiService();
