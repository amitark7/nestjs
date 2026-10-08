import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

@Processor('test-queue', {
  concurrency: 3,
})
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    console.log('🔔 TASK REMINDER');

    console.log('Task ID:', job.data.taskId);
    console.log('User ID:', job.data.userId);

    return {
      message: 'Task reminder processed',
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
