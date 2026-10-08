import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('test')
  addTestJob() {
    console.log('Queue Test ');
    return this.queueService.addHelloJob();
  }

  @Get('five')
  addFiveJobs() {
    return this.queueService.addFiveJobs();
  }

  @Get('jobs/completed')
  getCompletedJobs() {
    return this.queueService.getCompletedJobs();
  }

  @Get('jobs/failed')
  getFailedJobs() {
    return this.queueService.getFailedJobs();
  }

  @Get('jobs/stats')
  getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Get('jobs/delayed')
  getDelayedJobs() {
    return this.queueService.getDelayedJobs();
  }

  @Get('jobs/:taskId')
  getTaskReminderJob(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.queueService.getTaskReminderJob(taskId);
  }

  @Post('jobs/:taskId/retry')
  retryTaskReminder(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.queueService.retryTaskReminder(taskId);
  }

  @Delete('jobs/:taskId')
  removeTaskReminder(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.queueService.removeTaskReminder(taskId);
  }
}
