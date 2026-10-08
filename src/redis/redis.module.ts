import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { RedisThrottlerStorage } from './throttler.storage';

@Module({
  providers: [RedisService, RedisThrottlerStorage],
  controllers: [RedisController],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}
