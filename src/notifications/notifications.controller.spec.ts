import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { JwtAuthGuardGuard } from '../guards/jwt-auth-guard.guard'; // adjust path if needed

describe('NotificationsController', () => {
  let controller: NotificationsController;

  // Add every NotificationsService method that the controller calls.
  const mockNotificationsService = {
    findAll: jest.fn(),
    markAsRead: jest.fn(),
  };

  // Add every NotificationsGateway method that the controller calls.
  const mockNotificationsGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    })
      .overrideGuard(JwtAuthGuardGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
