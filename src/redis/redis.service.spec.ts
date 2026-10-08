import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@nestjs/cache-manager', () => ({
  CACHE_MANAGER: 'CACHE_MANAGER',
}));
jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));
jest.mock('@keyv/redis', () => ({
  createClient: jest.fn(),
}));

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
