import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('TaskManagement');

  log(message: string, payload?: unknown) {
    if (payload !== undefined) {
      this.logger.log(`${message} ${this.safeStringify(payload)}`);
    } else {
      this.logger.log(message);
    }
  }

  error(message: string, error?: unknown) {
    if (error instanceof Error) {
      this.logger.error(`${message}: ${error.message}`, error.stack);
      return;
    }

    if (error !== undefined) {
      this.logger.error(`${message}: ${this.safeStringify(error)}`);
      return;
    }

    this.logger.error(message);
  }

  warn(message: string, payload?: unknown) {
    if (payload !== undefined) {
      this.logger.warn(`${message} ${this.safeStringify(payload)}`);
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, payload?: unknown) {
    if (payload !== undefined) {
      this.logger.debug(`${message} ${this.safeStringify(payload)}`);
    } else {
      this.logger.debug(message);
    }
  }

  private safeStringify(value: unknown): string {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return '[Unable to serialize log payload]';
    }
  }
}
