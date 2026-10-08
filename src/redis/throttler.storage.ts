import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttler:${throttlerName}:${key}`;

    const totalHits = await this.redisService.redisClient.incr(redisKey);

    // Set expiry only for the first request
    if (totalHits === 1) {
      await this.redisService.redisClient.pExpire(redisKey, ttl);
    }

    const timeToExpire = await this.redisService.redisClient.pTTL(redisKey);

    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit) {
      isBlocked = true;

      if (blockDuration > 0) {
        const blockKey = `${redisKey}:blocked`;

        const blockExists =
          await this.redisService.redisClient.exists(blockKey);

        if (!blockExists) {
          await this.redisService.redisClient.set(blockKey, '1', {
            PX: blockDuration,
          });
        }

        const blockTtl = await this.redisService.redisClient.pTTL(blockKey);

        timeToBlockExpire = Math.max(blockTtl, 0);
      }
    }

    return {
      totalHits,
      timeToExpire: Math.max(timeToExpire, 0),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
