import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../tasks.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Learn NestJS',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Complete Swagger documentation',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.TODO,
  })
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @ApiProperty({
    example: '2026-10-10T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  dueDate!: Date;
}
