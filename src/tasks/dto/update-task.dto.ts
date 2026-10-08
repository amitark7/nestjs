import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsInt()
  @IsPositive()
  version!: number;
}
