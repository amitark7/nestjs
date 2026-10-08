import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['userId', 'isRead', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  taskId!: number;

  @Column()
  message!: string;

  @Column({
    default: false,
  })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
