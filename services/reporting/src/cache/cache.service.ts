import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface MemEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache abstraction that uses Redis when REDIS_URL is set and reachable, and
 * transparently falls back to an in-process Map otherwise (zero-infra dev).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private redisReady = false;
  private readonly mem = new Map<string, MemEntry>();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          // Stop hammering a missing Redis; fall back to memory instead.
          retryStrategy: () => null,
          reconnectOnError: () => false,
        });
        this.redis.on('ready', () => {
          this.redisReady = true;
        });
        this.redis.on('error', () => {
          this.redisReady = false;
        });
        this.redis.on('end', () => {
          this.redisReady = false;
        });
      } catch {
        this.redis = null;
      }
    }
  }

  backend(): 'redis' | 'memory' {
    return this.redis && this.redisReady ? 'redis' : 'memory';
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisReady) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        /* fall through to memory */
      }
    }
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.mem.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 30): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis && this.redisReady) {
      try {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      } catch {
        /* fall through to memory */
      }
    }
    this.mem.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        this.redis.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
