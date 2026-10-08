import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

// Must come before importing UsersService so the ESM-only
// @nestjs/cache-manager package is never loaded by Jest.
jest.mock('../redis/redis.service', () => ({
  RedisService: class {},
}));

import { UsersService } from './users.service';
import { UserRole, Users } from './user.entity';
import { Tasks } from '../tasks/tasks.entity';
import { LoggerService } from '../logger/logger.service';
import { RedisService } from '../redis/redis.service';
import { UserResponseDto } from './dto/response.dto';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockTaskRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  // Add every RedisService method that UsersService calls.
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUser = {
    id: 4,
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'hashed_password',
    role: UserRole.USER,
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: getRepositoryToken(Tasks),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ============================================================
  // BASIC
  // ============================================================

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // getUsers()
  // ============================================================

  describe('getUsers', () => {
    const users = [
      { ...mockUser, id: 1, name: 'Jane Doe' },
      { ...mockUser, id: 2, name: 'John Smith' },
    ];

    it('should return all users when no name is provided', async () => {
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.getUsers(undefined as any);

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });

    it('should return the matching users when name is provided', async () => {
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.getUsers('jane');

      expect(result).toEqual([users[0]]);
    });

    it('should return an empty array when no user matches the name', async () => {
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.getUsers('nonexistent');

      expect(result).toEqual([]);
    });

    it('should match name case-insensitively', async () => {
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.getUsers('JOHN');

      expect(result).toEqual([users[1]]);
    });
  });

  // ============================================================
  // getCurrentUser()
  // ============================================================

  describe('getCurrentUser', () => {
    it('should return the current user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(4);

      expect(result).toEqual(mockUserResponse);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 4 },
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getCurrentUser(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCurrentUser(999)).rejects.toThrow(
        'User not found with id 999',
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  // ============================================================
  // getUserById()
  // ============================================================

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.getUserById(4);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 4 });
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: 999,
      });
    });
  });

  // ============================================================
  // createUser()
  // ============================================================

  describe('createUser', () => {
    const createUserDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'plainPassword123',
    };

    it('should create a user', async () => {
      const createdUser = {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
      };

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.createUser(createUserDto as any);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual({
        message: 'User created Succesfully',
        user: mockUserResponse,
      });
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      mockUserRepository.create.mockReturnValue(createUserDto);
      mockUserRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createUser(createUserDto as any)).rejects.toThrow(
        'Failed to create user',
      );
    });
  });

  // ============================================================
  // updateUser()
  // ============================================================

  describe('updateUser', () => {
    const updateUserDto = { name: 'Updated Name' };

    it('should update a user', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateUser(4, updateUserDto as any);

      expect(mockUserRepository.update).toHaveBeenCalledWith(4, updateUserDto);
      expect(result).toEqual({ message: 'User Updated Successfully...' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.updateUser(999, updateUserDto as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // deleteUser()
  // ============================================================

  describe('deleteUser', () => {
    it('should soft delete a user', async () => {
      mockUserRepository.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteUser(4);

      expect(mockUserRepository.softDelete).toHaveBeenCalledWith({ id: 4 });
      expect(result).toEqual({ message: 'User Deleted Successfully...' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.softDelete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getUserTasks()
  // ============================================================

  describe('getUserTasks', () => {
    it('should return the user with their tasks', async () => {
      const userWithTasks = {
        ...mockUser,
        tasks: [{ id: 1, title: 'Task 1' }],
      };
      mockUserRepository.findOne.mockResolvedValue(userWithTasks);

      const result = await service.getUserTasks(4);

      expect(result).toEqual(userWithTasks);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 4 },
        relations: { tasks: true },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserTasks(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException when the query fails', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.getUserTasks(4)).rejects.toThrow(
        'Failed to fetch task',
      );
    });
  });
});
