import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskLogger } from './task.logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Tasks } from './tasks.entity';
import { DeepPartial, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RedisService } from 'src/redis/redis.service';
import { QueueService } from 'src/queue/queue.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Attachment } from 'src/attachments/attachment.entity';
import { Response } from 'express';
import { TaskResponseDto } from './dto/response.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Tasks)
    private readonly tasksRepository: Repository<Tasks>,
    private readonly taskLogger: TaskLogger,
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
  ) {}
  MAX_FILE_SIZE = 5 * 1024 * 1024;
  private toTaskResponse(task: any): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      remarks: task.remarks,
      estimatedMinutes: task.estimatedMinutes,
      version: task.version,
    };
  }

  private readonly allowedSortFields: Record<string, string> = {
    id: 'task.id',
    title: 'task.title',
    status: 'task.status',
    priority: 'task.priority',
    dueDate: 'task.dueDate',
    createdAt: 'task.createdAt',
    updatedAt: 'task.updatedAt',
    version: 'task.version',
  };

  async getTasks(
    userId: number,
    title?: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    priority?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.taskLogger.log('Fetching Task List...');

    const query = this.tasksRepository
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId });

    // Title
    if (title) {
      query.andWhere('task.title LIKE :title', { title: `%${title}%` });
    }

    // Search title + description
    if (search) {
      query.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Status
    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    // Priority
    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    // Sorting
    if (sortBy) {
      const sortField = this.allowedSortFields[sortBy];

      if (!sortField) {
        throw new BadRequestException(
          `Invalid sortBy. Allowed values: ${Object.keys(
            this.allowedSortFields,
          ).join(', ')}`,
        );
      }

      const sortOrder = order?.toUpperCase() || 'ASC';

      if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
        throw new BadRequestException(
          'Invalid order. Allowed values: ASC, DESC',
        );
      }

      query.orderBy(sortField, sortOrder);
    }

    // Pagination
    if (page && limit) {
      query.skip((page - 1) * limit);
      query.take(limit);
    }

    const [tasks, total] = await query.getManyAndCount();

    return {
      tasks: tasks.map((task) => this.toTaskResponse(task)),
      total,
      page,
      limit,
    };
  }

  async getAllTasks(
    title?: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    priority?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.taskLogger.log('Fetching Task List...');

    const query = this.tasksRepository.createQueryBuilder('task');

    // Title
    if (title) {
      query.andWhere('task.title LIKE :title', { title: `%${title}%` });
    }

    // Search title + description
    if (search) {
      query.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Status
    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    // Priority
    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    // Sorting
    if (sortBy) {
      const sortField = this.allowedSortFields[sortBy];

      if (!sortField) {
        throw new BadRequestException(
          `Invalid sortBy. Allowed values: ${Object.keys(
            this.allowedSortFields,
          ).join(', ')}`,
        );
      }

      const sortOrder = order?.toUpperCase() || 'ASC';

      if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
        throw new BadRequestException(
          'Invalid order. Allowed values: ASC, DESC',
        );
      }

      query.orderBy(sortField, sortOrder);
    }

    // Pagination
    if (page && limit) {
      query.skip((page - 1) * limit);
      query.take(limit);
    }

    const [tasks, total] = await query.getManyAndCount();

    return {
      tasks: tasks.map((task) => this.toTaskResponse(task)),
      total,
      page,
      limit,
    };
  }

  async getTaskById(userId: number, id: number) {
    this.taskLogger.log(`Fetching log with id ${id}`);
    const task = await this.tasksRepository.findOne({
      where: { id: id, userId: userId },
      relations: {
        attachments: true,
      },
    });
    if (!task) {
      throw new NotFoundException(`Task not found with id ${id}`);
    }
    return this.toTaskResponse(task);
  }

  async createTask(userId: number, task: CreateTaskDto) {
    try {
      this.taskLogger.log('Tasks Data', task);
      const taskData = this.tasksRepository.create({
        ...task,
        userId: userId,
      });
      const savedTask = await this.tasksRepository.save(taskData);

      try {
        await this.queueService.addTaskReminder(
          savedTask.id,
          userId,
          savedTask.dueDate,
        );
      } catch (error) {
        this.taskLogger.log(`Failed to add task reminder: ${error}`);
      }

      try {
        await this.redisService.deleteUserTaskCache(userId);
      } catch (error) {
        this.taskLogger.log('Failed to invalidate task cache..');
      }
      return {
        message: 'Task Added Successfully....',
        task: this.toTaskResponse(savedTask),
      };
    } catch (error) {
      this.taskLogger.log('Failed to create task', error);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async createTasks() {
    const tasks = [];

    this.tasksRepository.save(tasks as DeepPartial<Tasks>[]);
  }

  async updateTask(userId: number, id: number, data: UpdateTaskDto) {
    this.taskLogger.log(`Update Task Data For ID ${id}`);

    const { version, ...changes } = data;

    // 1. Check that the task exists and belongs to the user
    const task = await this.tasksRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 2. Remove old reminder
    try {
      await this.queueService.removeTaskReminder(id);
    } catch (error) {
      this.taskLogger.log(`Failed to remove old reminder: ${error}`);
    }

    // 3. Optimistic concurrency update
    const result = await this.tasksRepository
      .createQueryBuilder()
      .update(Tasks)
      .set({
        ...changes,
        version: () => '`version` + 1',
      })
      .where('`id` = :id', { id })
      .andWhere('`userId` = :userId', { userId })
      .andWhere('`version` = :version', { version })
      .andWhere('`deletedAt` IS NULL')
      .execute();

    // 4. Version mismatch
    if (result.affected === 0) {
      throw new ConflictException(
        'Task was modified by another request. Please reload the task and try again.',
      );
    }

    // 5. Get updated task
    const updatedTask = await this.tasksRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    // 6. Add new reminder
    if (updatedTask?.dueDate) {
      try {
        await this.queueService.addTaskReminder(
          updatedTask.id,
          userId,
          updatedTask.dueDate,
        );
      } catch (error) {
        this.taskLogger.log(`Failed to create new reminder: ${error}`);
      }
    }

    // 7. Invalidate Redis cache
    try {
      await this.redisService.deleteUserTaskCache(userId);
    } catch (error) {
      this.taskLogger.log('Failed to invalidate task cache...', error);
    }

    // 8. Return updated task
    return {
      message: 'Task Updated Successfully',
      task: updatedTask ? this.toTaskResponse(updatedTask) : null,
    };
  }

  async deleteTask(userId: number, id: number) {
    this.taskLogger.log(`Task Delete for id ${id}`);
    const res = await this.tasksRepository.softDelete({
      id: id,
      userId: userId,
    });
    if (res.affected == 0) {
      throw new NotFoundException(`Task not found with id ${id}`);
    }

    try {
      await this.redisService.deleteUserTaskCache(userId);
    } catch (error) {
      this.taskLogger.log('Failed to invallidate task cache...');
    }

    return { message: 'Task Deleted Successfully' };
  }

  async uploadAttachment(
    taskId: number,
    userId: number,
    file: Express.Multer.File,
  ) {
    // 1. Check task ownership
    const task = await this.tasksRepository.findOne({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 2. Create directory
    const uploadPath = path.join(
      process.cwd(),
      'uploads',
      'tasks',
      String(taskId),
    );

    await fs.mkdir(uploadPath, {
      recursive: true,
    });

    // 3. Generate unique filename
    const uniqueName = `${Date.now()}-${file.originalname}`;

    const filePath = path.join(uploadPath, uniqueName);

    // 4. Save physical file
    await fs.writeFile(filePath, file.buffer);

    try {
      // 5. Create DB record
      const attachment = this.attachmentRepository.create({
        taskId,
        originalName: file.originalname,
        fileName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
      });

      // 6. Save DB record
      const savedAttachment = await this.attachmentRepository.save(attachment);

      return savedAttachment;
    } catch (error) {
      // 7. DB failed → remove physical file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }

      throw error;
    }
  }

  async getAttachments(taskId: number, userId: number) {
    const task = await this.tasksRepository.findOne({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.attachmentRepository.find({
      where: {
        taskId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async downloadAttachment(
    taskId: number,
    attachmentId: number,
    userId: number,
    res: Response,
  ) {
    const task = await this.tasksRepository.findOne({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const attachment = await this.attachmentRepository.findOne({
      where: {
        id: attachmentId,
        taskId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      await fs.access(attachment.path);
    } catch {
      throw new NotFoundException('File not found on server');
    }

    res.setHeader('Content-Type', attachment.mimeType);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.originalName}"`,
    );

    return res.sendFile(attachment.path);
  }

  async deleteAttachment(taskId: number, attachmentId: number, userId: number) {
    // 1. Check task ownership
    const task = await this.tasksRepository.findOne({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 2. Find attachment belonging to this task
    const attachment = await this.attachmentRepository.findOne({
      where: {
        id: attachmentId,
        taskId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // 3. Delete physical file
    try {
      await fs.unlink(attachment.path);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // 4. Delete database record
    await this.attachmentRepository.remove(attachment);

    return {
      message: 'Attachment deleted successfully',
      attachmentId,
    };
  }
}
