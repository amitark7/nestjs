import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tasks } from './tasks.entity';
import { TaskLogger } from './task.logger';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';
import { QueueModule } from 'src/queue/queue.module';
import { AttachmentsModule } from 'src/attachments/attachments.module';
import { Attachment } from 'src/attachments/attachment.entity';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    QueueModule,
    AttachmentsModule,
    TypeOrmModule.forFeature([Tasks, Attachment]),
  ],
  providers: [TasksService, TaskLogger],
  controllers: [TasksController],
})
export class TasksModule {}
