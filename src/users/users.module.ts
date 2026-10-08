import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './user.entity';
import { Tasks } from 'src/tasks/tasks.entity';
import { LoggerService } from 'src/logger/logger.service';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [AuthModule, RedisModule, TypeOrmModule.forFeature([Users, Tasks])],
  controllers: [UsersController],
  providers: [UsersService, LoggerService],
  exports: [TypeOrmModule],
})
export class UsersModule {}
