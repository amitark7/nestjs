import { Exclude } from 'class-transformer';
import { Attachment } from 'src/attachments/attachment.entity';
import { Users } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
@Index(['userId', 'status'])
@Index(['userId', 'priority'])
export class Tasks {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'datetime' })
  dueDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedAt!: Date;

  @Column()
  userId!: number;

  @ManyToOne(() => Users, (user) => user.tasks)
  @JoinColumn({ name: 'userId' })
  user!: Users;

  @OneToMany(() => Attachment, (attachment) => attachment.task)
  attachments!: Attachment[];

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  remarks?: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  estimatedMinutes?: number;

  @VersionColumn()
  version!: number;
}
