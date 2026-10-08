import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('test-queue')
    private readonly testQueue: Queue,
    @InjectQueue('task-reminder')
    private readonly taskReminderQueue: Queue,
  ) {}

  async addTaskReminder(taskId: number, userId: number, dueDate: Date) {
    const delay = new Date(dueDate).getTime() - Date.now();

    if (delay <= 0) {
      return;
    }

    const job = await this.taskReminderQueue.add(
      'task-reminder',
      {
        taskId,
        userId,
      },
      {
        jobId: `task-reminder-${taskId}`,
        delay,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return job;
  }

  async getTaskReminderJob(taskId: number) {
    const jobId = `task-reminder-${taskId}`;

    const job = await this.taskReminderQueue.getJob(jobId);

    if (!job) {
      return {
        exists: false,
        message: 'Reminder job not found',
      };
    }

    return {
      exists: true,
      id: job.id,
      name: job.name,
      data: job.data,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      delay: job.delay,
    };
  }

  async removeTaskReminder(taskId: number) {
    const jobId = `task-reminder-${taskId}`;

    const job = await this.taskReminderQueue.getJob(jobId);

    if (!job) {
      return {
        removed: false,
        message: 'Reminder job not found',
      };
    }

    await job.remove();

    return {
      removed: true,
      jobId,
      message: 'Reminder job removed successfully',
    };
  }

  async retryTaskReminder(taskId: number) {
    const jobId = `task-reminder-${taskId}`;

    const job = await this.taskReminderQueue.getJob(jobId);

    if (!job) {
      return {
        retried: false,
        message: 'Reminder job not found',
      };
    }

    await job.retry();

    return {
      retried: true,
      jobId,
      message: 'Reminder job retry started',
    };
  }

  async getCompletedJobs() {
    const jobs = await this.taskReminderQueue.getCompleted(0, 20);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
    }));
  }

  async getFailedJobs() {
    const jobs = await this.taskReminderQueue.getFailed(0, 20);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    }));
  }

  async getQueueStats() {
    return await this.taskReminderQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
  }

  async getDelayedJobs() {
    const jobs = await this.taskReminderQueue.getDelayed(0, 20);

    return jobs.map((job) => ({
      jobId: job.id,
      taskId: job.data.taskId,
      userId: job.data.userId,
      name: job.name,
      delay: job.delay,
      timestamp: job.timestamp,
      state: 'delayed',
    }));
  }

  async addHelloJob() {
    const job = await this.testQueue.add(
      'test-queue',
      {
        userId: 12,
        taskId: 10,
      },
      {
        delay: 10000,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
      },
    );

    return {
      jobId: job.id,
      taskId: 10,
      delay: 10000,
    };
  }

  async addFiveJobs() {
    const jobs = await this.testQueue.addBulk([
      {
        name: 'hello-job',
        data: { message: 'Job 1' },
      },
      {
        name: 'hello-job',
        data: { message: 'Job 2' },
      },
      {
        name: 'hello-job',
        data: { message: 'Job 3' },
      },
      {
        name: 'hello-job',
        data: { message: 'Job 4' },
      },
      {
        name: 'hello-job',
        data: { message: 'Job 5' },
      },
    ]);

    return {
      jobIds: jobs.map((job) => job.id),
    };
  }
}
