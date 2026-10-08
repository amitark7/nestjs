import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tasks } from 'src/tasks/tasks.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  taskId!: number;

  @Column()
  originalName!: string;

  @Column()
  fileName!: string;

  @Column()
  mimeType!: string;

  @Column()
  size!: number;

  @Column()
  path!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Tasks, (task) => task.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'taskId',
  })
  task!: Tasks;
}
