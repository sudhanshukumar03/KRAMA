import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisService } from '../services/redis.service';
// Strict limit for login/signup: 5 requests per 15 minutes per IP
export const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    store: new RedisStore({
        sendCommand: (...args) => redisService.client.sendCommand(args),
        prefix: 'rl:auth:strict:',
    }),
});
// Looser limit for refresh: 30 requests per 15 minutes per IP
export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many refresh attempts, please try again later' },
    store: new RedisStore({
        sendCommand: (...args) => redisService.client.sendCommand(args),
        prefix: 'rl:auth:refresh:',
    }),
});
//# sourceMappingURL=rateLimit.middleware.js.map