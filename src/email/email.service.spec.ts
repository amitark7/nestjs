import { Test, TestingModule } from '@nestjs/testing';

// Must come before importing EmailService so the ESM-only
// @nestjs/config package is never loaded by Jest.
jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));

import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
    getOrThrow: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
