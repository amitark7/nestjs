import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('test')
  async testRedis() {
    await this.redisService.set(
      'nest-test-key',
      {
        message: 'Redis is working from NestJS!',
      },
      300000, // 5 minutes
    );

    const value = await this.redisService.get('nest-test-key');

    return {
      value,
    };
  }
}
