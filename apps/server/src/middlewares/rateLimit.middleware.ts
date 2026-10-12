import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisService } from '../services/redis.service';

const getStore = (prefix: string) => {
  // Development/tests use a process-local counter. Production requires shared
  // Redis limits and rejects sensitive requests when the store is unavailable.
  if (process.env.NODE_ENV !== 'production') {
    return undefined;
  }
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      try {
        if (!redisService.isConnected || redisService.client.status !== 'ready') {
          await redisService.ensureConnected(3000);
        }
        return await (redisService.client as any).call(...args);
      } catch {
        // Sensitive requests must stop when the shared limit cannot be checked.
        // Expose a stable 503, rather than Redis/infrastructure error details.
        throw Object.assign(new Error('Service temporarily unavailable. Please try again later.'), { status: 503 });
      }
    },
    prefix,
  });
};

// Strict limit for login/signup per IP. Secure default of 10 per 15 min; override
// via AUTH_RATE_LIMIT_MAX for E2E/CI runs that perform many auth calls.
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  validate: { xForwardedForHeader: false },
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  store: getStore('rl:auth:strict:'),
});

// Looser limit for refresh per IP. Secure default of 30 per 15 min; override
// via REFRESH_RATE_LIMIT_MAX for E2E/CI runs.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.REFRESH_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  validate: { xForwardedForHeader: false },
  message: { message: 'Too many refresh attempts, please try again later' },
  store: getStore('rl:auth:refresh:'),
});

// AI Gateway Limit: e.g., 20 requests per minute per workspace
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_PER_MIN || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  validate: { xForwardedForHeader: false },
  message: { message: 'Too many AI requests from this workspace, please try again later' },
  keyGenerator: (req) => {
    // Key by the workspaceId validated and resolved by the session/RBAC middleware
    const workspaceId = (req as any).workspaceId;
    return workspaceId ? `rl:ai:ws:${workspaceId}` : `rl:ai:anonymous`;
  },
  store: getStore('rl:ai:'),
});
