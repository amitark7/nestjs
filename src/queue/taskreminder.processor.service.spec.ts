// ESM-only packages: replace with local mocks before anything imports them.
jest.mock('@nestjs/bullmq', () => require('../test-mocks/bullmq.mock'));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TaskReminderProcessor } from './taskreminder.processor.service';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Users } from '../users/user.entity';

describe('TaskReminderProcessor', () => {
  let processor: TaskReminderProcessor;

  const mockNotificationsService = {
    createTaskReminder: jest.fn(),
  };

  const mockNotificationsGateway = {
    sendNotification: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendTaskReminderEmail: jest.fn(),
  };

  const mockUser = { id: 4, email: 'jane@example.com' };
  const mockNotification = { id: 7, message: 'Task #10 is due.' };
  const mockJob = { id: 'job-1', data: { taskId: 10, userId: 4 } } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // The processor logs to the console; keep test output clean.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReminderProcessor,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    processor = module.get<TaskReminderProcessor>(TaskReminderProcessor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should create a notification, push it and send an email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockNotificationsService.createTaskReminder.mockResolvedValue({
        created: true,
        notification: mockNotification,
      });
      mockEmailService.sendTaskReminderEmail.mockResolvedValue(undefined);

      const result = await processor.process(mockJob);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 4 },
      });
      expect(mockNotificationsService.createTaskReminder).toHaveBeenCalledWith(
        4,
        10,
        'Task #10 is due.',
      );
      expect(mockNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        4,
        mockNotification,
      );
      expect(mockEmailService.sendTaskReminderEmail).toHaveBeenCalledWith(
        'jane@example.com',
        10,
        'Task #10 is due.',
      );
      expect(result).toEqual({
        message: 'Task reminder processed',
        notificationId: 7,
      });
    });

    it('should not push over the gateway when no new notification was created', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockNotificationsService.createTaskReminder.mockResolvedValue({
        created: false,
        notification: mockNotification,
      });
      mockEmailService.sendTaskReminderEmail.mockResolvedValue(undefined);

      await processor.process(mockJob);

      expect(mockNotificationsGateway.sendNotification).not.toHaveBeenCalled();
      // The email is sent regardless of whether the notification was new.
      expect(mockEmailService.sendTaskReminderEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw when the user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'User 4 not found',
      );

      expect(
        mockNotificationsService.createTaskReminder,
      ).not.toHaveBeenCalled();
      expect(mockEmailService.sendTaskReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('worker events', () => {
    it('should handle the completed event', () => {
      expect(() => processor.onCompleted(mockJob)).not.toThrow();
    });

    it('should handle the failed event', () => {
      expect(() =>
        processor.onFailed(mockJob, new Error('boom')),
      ).not.toThrow();
    });
  });
});
