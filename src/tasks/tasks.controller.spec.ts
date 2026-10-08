// ESM-only packages: replace with local mocks before anything imports them.
jest.mock('@nestjs/bullmq', () => require('../test-mocks/bullmq.mock'));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('@nestjs/cache-manager', () => ({ CACHE_MANAGER: 'CACHE_MANAGER' }));
jest.mock('../redis/redis.service', () => ({ RedisService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { RedisService } from '../redis/redis.service';
import { JwtAuthGuardGuard } from '../guards/jwt-auth-guard.guard'; // adjust path if needed

describe('TasksController', () => {
  let controller: TasksController;

  // Add every TasksService method that TasksController calls.
  const mockTasksService = {
    getTasks: jest.fn(),
    getTaskById: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  };

  // Add every RedisService method that TasksController calls.
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuardGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
