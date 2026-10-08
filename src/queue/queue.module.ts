import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueProcessor } from './queue.processor.service';
import { TaskReminderProcessor } from './taskreminder.processor.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    BullModule.registerQueue({
      name: 'test-queue',
    }),

    BullModule.registerQueue({
      name: 'task-reminder',
    }),
    NotificationsModule,
    UsersModule,
    EmailModule,
  ],

  controllers: [QueueController],

  providers: [QueueService, QueueProcessor, TaskReminderProcessor],

  exports: [QueueService],
})
export class QueueModule {}
