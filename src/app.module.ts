import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { Users } from './users/user.entity';
import { UsersController } from './users/users.controller';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { TasksModule } from './tasks/tasks.module';
import { Tasks } from './tasks/tasks.entity';
import { TasksController } from './tasks/tasks.controller';
import { AuthModule } from './auth/auth.module';
import { LoggerService } from './logger/logger.service';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/entities/notification.entity';
import { EmailModule } from './email/email.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from './guards/user-throttler.guard';
import { RedisThrottlerStorage } from './redis/throttler.storage';
import { AttachmentsModule } from './attachments/attachments.module';
import { Attachment } from './attachments/attachment.entity';
import { HealthModule } from './health/health.module';
import * as Joi from 'joi';
import configuration from './config/configuration';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],

      inject: [RedisThrottlerStorage],

      useFactory: (redisThrottlerStorage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: process.env.NODE_ENV === 'test' ? 100 : 5,
          },
        ],

        storage: redisThrottlerStorage,
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: process.env.NODE_ENV === 'test' ? '.env.e2e' : '.env',

      load: [configuration],

      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        PORT: Joi.number().default(3000),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_DATABASE: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),

        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        REDIS_URL: Joi.string().required(),

        CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,

      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://127.0.0.1:6379',
        );

        return {
          stores: [createKeyv(redisUrl)],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),

        entities: [Users, Tasks, Notification, Attachment],

        synchronize: configService.getOrThrow<boolean>('database.synchronize'),
        logging:
          configService.get<string>('NODE_ENV') === 'development'
            ? ['query', 'error']
            : ['error'],

        extra: {
          connectionLimit: 10,
        },
      }),
    }),
    UsersModule,
    TasksModule,
    AuthModule,
    LoggerModule,
    RedisModule,
    QueueModule,
    NotificationsModule,
    EmailModule,
    AttachmentsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    RedisThrottlerStorage,
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(UsersController, TasksController);
  }
}
