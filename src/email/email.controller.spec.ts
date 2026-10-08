import { Test, TestingModule } from '@nestjs/testing';

// Must come before importing EmailController so the ESM-only
// @nestjs/config package is never loaded by Jest.
jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));

import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;

  // Add every EmailService method that EmailController calls.
  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
