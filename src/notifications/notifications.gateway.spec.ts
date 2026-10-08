import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  const mockJwtService = {
    verifyAsync: jest.fn(),
    verify: jest.fn(),
    sign: jest.fn(),
  };

  // Add every NotificationsService method that the gateway calls.
  const mockNotificationsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
