import { Test, TestingModule } from '@nestjs/testing';

// @nestjs/bullmq is ESM-only, so replace it with the local mock.
jest.mock('@nestjs/bullmq', () => require('../test-mocks/bullmq.mock'));

import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('test-queue'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('task-reminder'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
