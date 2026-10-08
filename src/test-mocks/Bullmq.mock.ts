// Jest stand-in for the ESM-only @nestjs/bullmq package.
// Mapped in the Jest config via moduleNameMapper, so real Redis/BullMQ code never loads in unit tests.
import { Inject } from '@nestjs/common';

export const getQueueToken = (name?: string) => `BullQueue_${name ?? 'default'}`;

// Behaves like the real decorator: injects the queue registered under `name`.
export const InjectQueue = (name?: string) => Inject(getQueueToken(name));

// Class / method decorators that do nothing.
export const Processor = (..._args: any[]) => (_target: any) => undefined;
export const OnWorkerEvent = (..._args: any[]) =>
  (_target: any, _key?: any, _desc?: any) => undefined;

export class WorkerHost {}

export class BullModule {
  static forRoot() {
    return { module: BullModule };
  }
  static forRootAsync() {
    return { module: BullModule };
  }
  static registerQueue() {
    return { module: BullModule };
  }
  static registerQueueAsync() {
    return { module: BullModule };
  }
}