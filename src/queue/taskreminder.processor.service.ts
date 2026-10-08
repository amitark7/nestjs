import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';

import { Job } from 'bullmq';
import { EmailService } from 'src/email/email.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Users } from 'src/users/user.entity';
import { Repository } from 'typeorm';

@Processor('task-reminder')
export class TaskReminderProcessor extends WorkerHost {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly emailService: EmailService,
  ) {
    super();
  }
  async process(job: Job) {
    console.log('🔔 TASK REMINDER');

    const { taskId, userId } = job.data;

    console.log('Task ID:', taskId);
    console.log('User ID:', userId);

    // 1. Find user
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const result = await this.notificationService.createTaskReminder(
      userId,
      taskId,
      `Task #${taskId} is due.`,
    );

    if (result.created) {
      this.notificationsGateway.sendNotification(userId, result.notification);
    }

    // 4. Email notification
    await this.emailService.sendTaskReminderEmail(
      user.email,
      taskId,
      `Task #${taskId} is due.`,
    );

    console.log(`📧 Reminder email sent to ${user.email}`);

    return {
      message: 'Task reminder processed',
      notificationId: result.notification.id,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`✅ Reminder completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.log(`❌ Reminder failed: ${job.id}`, error.message);
  }
}
