import { Test, TestingModule } from '@nestjs/testing';

// Must come before importing RedisController so the ESM-only
// @nestjs/cache-manager and @nestjs/config packages are never loaded by Jest.
jest.mock('./redis.service', () => ({
  RedisService: class {},
}));

import { RedisController } from './redis.controller';
import { RedisService } from './redis.service';

describe('RedisController', () => {
  let controller: RedisController;

  // Add every RedisService method that RedisController calls.
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedisController],
      providers: [
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    controller = module.get<RedisController>(RedisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
