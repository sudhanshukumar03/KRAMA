import type { RedisClientType } from 'redis';
declare class RedisService {
    client: RedisClientType;
    constructor();
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
}
export declare const redisService: RedisService;
export {};
//# sourceMappingURL=redis.service.d.ts.map