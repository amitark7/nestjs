import { Test, TestingModule } from '@nestjs/testing';

// @nestjs/config is ESM-only; AuthService imports it.
jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuardGuard } from '../guards/jwt-auth-guard.guard'; // adjust path if needed

describe('AuthController', () => {
  let controller: AuthController;

  // Add every AuthService method that AuthController calls.
  const mockAuthService = {
    registerUser: jest.fn(),
    loginUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuardGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
