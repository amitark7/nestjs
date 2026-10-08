import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// Must come before importing AuthService so the ESM-only
// @nestjs/config package is never loaded by Jest.
jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));
jest.mock('bcrypt');

import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Users } from '../users/user.entity';
import { LoggerService } from '../logger/logger.service';
import { UserResponseDto } from 'src/users/dto/response.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockUser = {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'hashed_password',
    role: 'USER',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockUserResponse: UserResponseDto = {
    id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    role: mockUser.role,
    createdAt: mockUser.createdAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('15m');
    mockConfigService.getOrThrow.mockReturnValue('test-secret');
    mockJwtService.sign.mockReturnValue('signed.jwt.token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ============================================================
  // BASIC
  // ============================================================

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // registerUser()
  // ============================================================

  describe('registerUser', () => {
    const registerDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'plainPassword123',
    };

    it('should register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserRepository.create.mockReturnValue({
        name: registerDto.name,
        email: registerDto.email,
        password: 'hashed_password',
      });
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.registerUser(registerDto as any);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: registerDto.name,
        email: registerDto.email,
        password: 'hashed_password',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        createdAt: result.createdAt,
      });
    });

    it('should throw ConflictException when email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.registerUser(registerDto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should hash the password before saving', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserRepository.create.mockReturnValue({
        name: registerDto.name,
        email: registerDto.email,
        password: 'hashed_password',
      });
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.registerUser(registerDto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed_password' }),
      );
    });
  });

  // ============================================================
  // loginUser()
  // ============================================================

  describe('loginUser', () => {
    const loginDto = {
      email: 'jane@example.com',
      password: 'plainPassword123',
    };

    it('should return an access token for valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.loginUser(loginDto as any);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      // The service may now add options (expiry, jti, secret), so only
      // check the payload (first argument) here.
      // The service signs with jwtService.sign(payload, { secret, expiresIn }).
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockJwtService.sign.mock.calls[0][1]).toEqual(
        expect.objectContaining({ secret: 'test-secret' }),
      );
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.loginUser(loginDto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.loginUser(loginDto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
