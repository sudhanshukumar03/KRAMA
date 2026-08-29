import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

class RedisService {
  public client: RedisClientType;
  public isConnected: boolean = false;
  private memoryStore: Map<string, { value: string; expiresAt?: number }> = new Map();
  private hasLoggedWarning: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries: number) => {
          if (!this.hasLoggedWarning) {
            console.warn('[Redis] Redis server not reachable on localhost:6379. Operating with in-memory fallback cache.');
            this.hasLoggedWarning = true;
          }
          return Math.min(retries * 1000, 15000);
        },
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

    // Auto connect in background
    this.client.connect().catch(() => {
      this.isConnected = false;
    });
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client.isOpen) {
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
    if (this.isConnected && this.client.isOpen) {
      try {
        if (ttlSeconds) {
          await this.client.setEx(key, ttlSeconds, value);
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
    if (this.isConnected && this.client.isOpen) {
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
}

export const redisService = new RedisService();
