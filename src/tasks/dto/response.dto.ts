import { TaskPriority, TaskStatus } from '../tasks.entity';

export class TaskResponseDto {
  id!: number;
  title!: string;
  description!: string;
  status!: TaskStatus;
  priority!: TaskPriority;
  dueDate!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  remarks!: string | null;
  estimatedMinutes!: number | null;
  version!: number;
}
