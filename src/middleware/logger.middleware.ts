import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      this.loggerService.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  }
}
