import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RoleGuard } from 'src/guards/role.guard';
import { JwtAuthGuardGuard } from 'src/guards/jwt-auth-guard.guard';
import { Roles } from 'src/auth/decorators/roles/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user/current-user.decorator';
import { RedisService } from 'src/redis/redis.service';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';

import * as path from 'path';
import type { Response } from 'express';

@ApiBearerAuth()
@UseGuards(JwtAuthGuardGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly redisService: RedisService,
  ) {}

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 100 : 5,
      ttl: 60000,
    },
  })
  @Get()
  async getTasks(
    @CurrentUser() user: any,
    @Query('title') title?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    const cacheKey = [
      'tasks',
      `user:${user.id}`,
      `page:${page ?? ''}`,
      `limit:${limit ?? ''}`,
      `search:${search ?? ''}`,
      `status:${status ?? ''}`,
      `priority:${priority ?? ''}`,
      `sortBy:${sortBy ?? ''}`,
      `order:${order ?? ''}`,
    ].join(':');

    const cachedTasks = await this.redisService.get(cacheKey);

    if (cachedTasks) {
      console.log('CACHE HIT');

      return cachedTasks;
    }

    console.log('CACHE MISS');

    const tasks = await this.tasksService.getTasks(
      user.id,
      title,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      status,
      priority,
      sortBy,
      order,
    );

    await this.redisService.set(cacheKey, tasks, 60000);

    return tasks;
  }

  @Get('/admin/tasks')
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN)
  getAllTasks(
    @Query('title') title?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.tasksService.getAllTasks(
      title,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      status,
      priority,
      sortBy,
      order,
    );
  }

  @Get(':id')
  getTaskById(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    const userId = user.id;
    return this.tasksService.getTaskById(userId, id);
  }

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 100 : 5,
      ttl: 60000,
    },
  })
  @Post()
  createTask(@CurrentUser() user: any, @Body() data: CreateTaskDto) {
    const userId = user.id;
    return this.tasksService.createTask(userId, data);
  }

  @Post('seed')
  createTasks() {
    return this.tasksService.createTasks();
  }

  @Put(':id')
  updateTask(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTaskDto,
  ) {
    const userId = user.id;
    return this.tasksService.updateTask(userId, id, data);
  }

  @Delete(':id')
  deleteTask(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    const userId = user.id;
    return this.tasksService.deleteTask(userId, id);
  }

  @Get(':id/attachments')
  @UseGuards(JwtAuthGuardGuard)
  getAttachments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.getAttachments(Number(id), user.id);
  }

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuardGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

        const extension = path.extname(file.originalname).toLowerCase();

        if (!allowedExtensions.includes(extension)) {
          return callback(
            new BadRequestException(
              'Only PDF, JPG, JPEG and PNG files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tasksService.uploadAttachment(Number(id), user.id, file);
  }

  @Get(':id/attachments/:attachmentId')
  @UseGuards(JwtAuthGuardGuard)
  downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    return this.tasksService.downloadAttachment(
      Number(id),
      Number(attachmentId),
      user.id,
      res,
    );
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(JwtAuthGuardGuard)
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteAttachment(
      Number(id),
      Number(attachmentId),
      user.id,
    );
  }
}
