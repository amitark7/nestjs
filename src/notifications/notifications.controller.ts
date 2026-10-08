import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuardGuard } from 'src/guards/jwt-auth-guard.guard';
import { CurrentUser } from 'src/common/decorators/current-user/current-user.decorator';
import { NotificationsGateway } from './notifications.gateway';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuardGuard)
  getNotifications(@CurrentUser() user: any) {
    return this.notificationService.getUserNotifications(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuardGuard)
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Get('unread')
  @UseGuards(JwtAuthGuardGuard)
  getUnreadNotifications(@CurrentUser() user: any) {
    return this.notificationService.getUnreadNotifications(user.id);
  }

  @Get('unread/count')
  @UseGuards(JwtAuthGuardGuard)
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.id);
  }

  // @Post('test')
  // testNotification() {
  //   this.notificationsGateway.sendNotification();
  //   return {
  //     message: 'Notification sent',
  //   };
  // }
}
