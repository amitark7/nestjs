import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Attachment } from '../attachments/attachment.entity';

// Must come before importing TasksService so the ESM-only
// @nestjs/cache-manager package is never loaded by Jest.
jest.mock('../redis/redis.service', () => ({
  RedisService: class {},
}));
jest.mock('../queue/queue.service', () => ({
  QueueService: class {},
}));

import { TasksService } from './tasks.service';
import { Tasks } from './tasks.entity';
import { TaskLogger } from './task.logger';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockAttachmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTaskLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  // Add every RedisService method that TasksService calls.
  // Rename deleteUserTasksCache to match your real method name.
  const mockRedisService = {
    deleteUserTasksCache: jest.fn(),
  };

  // Add every QueueService method that TasksService calls.
  // Rename addJob to match your real method name.
  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockTask = {
    id: 10,
    title: 'Learn Jest',
    description: 'Practice unit testing',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: '2026-10-10',
    userId: 4,
  };

  // The service no longer returns userId in task responses.
  const { userId: _omitUserId, ...expectedTask } = mockTask;

  beforeEach(async () => {
    jest.clearAllMocks();
    // clearAllMocks doesn't reset implementations set with mockResolvedValue,
    // so reset these explicitly to stop values leaking between tests.
    mockTaskRepository.findOne.mockReset();
    mockQueryBuilder.execute.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Tasks),
          useValue: mockTaskRepository,
        },
        {
          provide: TaskLogger,
          useValue: mockTaskLogger,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: getRepositoryToken(Attachment),
          useValue: mockAttachmentRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ============================================================
  // BASIC
  // ============================================================

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // getTaskById()
  // ============================================================

  describe('getTaskById', () => {
    it('should return a task by id for the user', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskById(4, 10);

      expect(result).toEqual(expectedTask);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 10,
          userId: 4,
        },
        relations: { attachments: true },
      });
    });

    it('should throw NotFoundException when task is not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTaskById(4, 999)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 999,
          userId: 4,
        },
        relations: { attachments: true },
      });
    });

    it('should throw NotFoundException when task belongs to another user', async () => {
      // Because the query includes userId,
      // repository returns null when the task belongs to another user.
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTaskById(4, 10)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 10,
          userId: 4,
        },
        relations: { attachments: true },
      });
    });
  });

  // ============================================================
  // createTask()
  // ============================================================

  describe('createTask', () => {
    const createTaskDto = {
      title: 'Learn NestJS',
      description: 'Practice NestJS unit testing',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: '2026-10-10',
    };

    it('should create a task for the user', async () => {
      const createdTask = {
        ...createTaskDto,
        userId: 4,
      };

      mockTaskRepository.create.mockReturnValue(createdTask);
      mockTaskRepository.save.mockResolvedValue(createdTask);

      const result = await service.createTask(4, createTaskDto as any);

      expect(mockTaskRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        userId: 4,
      });

      expect(mockTaskRepository.save).toHaveBeenCalledWith(createdTask);
      expect(result.message).toBe('Task Added Successfully....');
      expect(result.task).toMatchObject({
        title: 'Learn NestJS',
        status: 'TODO',
        priority: 'HIGH',
      });
    });

    it('should attach the correct userId to the task', async () => {
      const createdTask = {
        ...createTaskDto,
        userId: 4,
      };

      mockTaskRepository.create.mockReturnValue(createdTask);
      mockTaskRepository.save.mockResolvedValue(createdTask);

      await service.createTask(4, createTaskDto as any);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 4,
        }),
      );
    });

    it('should save the created task', async () => {
      const createdTask = {
        ...createTaskDto,
        userId: 4,
      };

      mockTaskRepository.create.mockReturnValue(createdTask);
      mockTaskRepository.save.mockResolvedValue(createdTask);

      await service.createTask(4, createTaskDto as any);

      expect(mockTaskRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // getTasks()
  // ============================================================

  describe('getTasks', () => {
    it('should return tasks for the user', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTask], 1]);

      const result = await service.getTasks(4);

      expect(result).toEqual({
        tasks: [expectedTask],
        total: 1,
        page: undefined,
        limit: undefined,
      });

      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalledWith(
        'task',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.userId = :userId',
        { userId: 4 },
      );
    });

    it('should return an empty array when user has no tasks', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getTasks(4);

      expect(result.tasks).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should query tasks using the userId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTask], 1]);

      await service.getTasks(4);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.userId = :userId',
        { userId: 4 },
      );
    });
  });

  // ============================================================
  // updateTask()
  // ============================================================

  describe('updateTask', () => {
    const updateTaskDto = {
      title: 'Updated Task',
      priority: 'LOW',
    };

    it('should update a task belonging to the user', async () => {
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        ...updateTaskDto,
      });
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await service.updateTask(4, 10, updateTaskDto as any);

      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Tasks);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining(updateTaskDto),
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      await expect(
        service.updateTask(4, 999, updateTaskDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use both taskId and userId when updating', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      await service.updateTask(4, 10, updateTaskDto as any);

      // Collect every argument passed to where()/andWhere() and check
      // that both the task id and the user id appear in the update query.
      const whereArgs = JSON.stringify([
        ...mockQueryBuilder.where.mock.calls,
        ...mockQueryBuilder.andWhere.mock.calls,
      ]);

      expect(whereArgs).toContain('10');
      expect(whereArgs).toContain('4');
    });
  });

  // ============================================================
  // deleteTask()
  // ============================================================

  describe('deleteTask', () => {
    it('should soft delete a task belonging to the user', async () => {
      mockTaskRepository.softDelete.mockResolvedValue({
        affected: 1,
      });

      const result = await service.deleteTask(4, 10);

      expect(mockTaskRepository.softDelete).toHaveBeenCalledWith({
        id: 10,
        userId: 4,
      });

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskRepository.softDelete.mockResolvedValue({
        affected: 0,
      });

      await expect(service.deleteTask(4, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use both taskId and userId when deleting', async () => {
      mockTaskRepository.softDelete.mockResolvedValue({
        affected: 1,
      });

      await service.deleteTask(4, 10);

      expect(mockTaskRepository.softDelete).toHaveBeenCalledWith({
        id: 10,
        userId: 4,
      });
    });
  });
});
