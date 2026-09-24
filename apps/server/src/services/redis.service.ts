import 'dotenv/config';
import Redis from 'ioredis';

class RedisService {
  public client: Redis;
  public isConnected: boolean = false;
  private memoryStore: Map<string, { value: string; expiresAt?: number }> = new Map();
  private hasLoggedWarning: boolean = false;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (retries: number) => {
        if (retries > 5 && process.env.NODE_ENV !== 'test') {
          console.error('[CRITICAL] Auth system requires Redis for distributed locking. In-memory fallback is disabled outside of tests.');
          process.exit(1);
        }
        if (!this.hasLoggedWarning) {
          console.warn('[Redis] Redis server not reachable. Operating with in-memory fallback cache.');
          this.hasLoggedWarning = true;
        }
        return Math.min(retries * 500, 5000);
      },
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      if (!this.hasLoggedWarning) {
        console.warn('[Redis] Connection warning:', err.message);
        this.hasLoggedWarning = true;
      }
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.hasLoggedWarning = false;
      console.log('[Redis] Connected to Redis server');
    });

    this.client.connect().catch(() => {
      this.isConnected = false;
    });
  }

  public async ensureConnected(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (this.client.status !== 'ready' && (Date.now() - start) < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<number> {
    let count = 0;
    if (this.isConnected && this.client.status === 'ready') {
      try {
        count = await this.client.del(key);
      } catch {
        // Fallback to memory
      }
    }
    if (this.memoryStore.has(key)) {
      this.memoryStore.delete(key);
      count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.incr(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = this.memoryStore.get(key);
    let val = 1;
    if (item && !isNaN(Number(item.value))) {
      val = Number(item.value) + 1;
    }
    this.memoryStore.set(key, { value: val.toString() });
    return val;
  }
}

export const redisService = new RedisService();
