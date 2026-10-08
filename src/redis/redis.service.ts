import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createClient } from '@keyv/redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly redisClient: any;
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://127.0.0.1:6379',
    );

    this.redisClient = createClient({
      url: redisUrl,
    });
  }

  async onModuleInit() {
    await this.redisClient.connect(); // ← required
  }

  async set(key: string, value: any, ttl?: number) {
    return await this.cacheManager.set(key, value, ttl);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async del(key: string) {
    return await this.cacheManager.del(key);
  }

  async deleteUserTaskCache(userId: number) {
    const pattern = `tasks:user:${userId}:*`;

    const keys = await this.redisClient.keys(pattern);
    for (const key of keys) {
      await this.redisClient.del(key);
    }
    await this.del(`user:${userId}:tasks`);
  }

  async deleteUserCache() {
    const keys = await this.redisClient.keys('users:*');
    for (const key of keys) {
      await this.redisClient.del(key);
    }
  }

  async incrementWithExpiry(key: string, ttl: number): Promise<number> {
    const count = await this.redisClient.incr(key);

    if (count === 1) {
      await this.redisClient.expire(key, Math.ceil(ttl / 1000));
    }

    return count;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
