import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuardGuard } from '../guards/jwt-auth-guard.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getMe: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuardGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
