import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly loggerService: LoggerService,
  ) {}

  async createTaskReminder(userId: number, taskId: number, message: string) {
    const existing = await this.notificationRepository.findOne({
      where: {
        userId,
        taskId,
        message,
      },
    });

    if (existing) {
      return {
        notification: existing,
        created: false,
      };
    }

    const notification = await this.notificationRepository.save({
      userId,
      taskId,
      message,
      isRead: false,
    });

    return {
      notification,
      created: true,
    };
  }
  async getUserNotifications(userId: number) {
    return await this.notificationRepository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;

    return await this.notificationRepository.save(notification);
  }

  async getUnreadNotifications(userId: number) {
    return await this.notificationRepository.find({
      where: {
        userId,
        isRead: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getUnreadCount(userId: number) {
    const count = await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return {
      count,
    };
  }
}
