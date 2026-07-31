import { createClient } from 'redis';
class RedisService {
    client;
    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        this.client.on('error', (err) => {
            console.error('[Redis Error]:', err);
        });
        this.client.on('connect', () => {
            console.log('[Redis] Connected to Redis server');
        });
        // Auto connect
        this.client.connect().catch(console.error);
    }
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.setEx(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
}
export const redisService = new RedisService();
//# sourceMappingURL=redis.service.js.map