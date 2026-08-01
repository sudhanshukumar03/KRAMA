import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisService } from '../services/redis.service';

// Strict limit for login/signup: 500 requests per 15 minutes per IP (increased for E2E testing)
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisService.client.sendCommand(args),
    prefix: 'rl:auth:strict:',
  }),
});

// Looser limit for refresh: 30 requests per 15 minutes per IP (increased for E2E testing)
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many refresh attempts, please try again later' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisService.client.sendCommand(args),
    prefix: 'rl:auth:refresh:',
  }),
});

// AI Gateway Limit: e.g., 20 requests per minute per workspace
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_PER_MIN || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many AI requests from this workspace, please try again later' },
  keyGenerator: (req) => {
    // Key by the workspaceId validated and resolved by the session/RBAC middleware
    const workspaceId = (req as any).workspaceId;
    return workspaceId ? `rl:ai:ws:${workspaceId}` : `rl:ai:anonymous`;
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisService.client.sendCommand(args),
    prefix: 'rl:ai:',
  }),
});
