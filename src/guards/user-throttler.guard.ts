import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';

import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
      429,
    );
  }
}
