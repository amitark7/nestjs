import { Exclude } from 'class-transformer';
import { Tasks } from 'src/tasks/tasks.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  refreshTokenHash!: string | null;

  @Column({ type: 'datetime', nullable: true })
  @Exclude()
  refreshTokenExpiresAt!: Date | null;

  @OneToMany(() => Tasks, (task) => task.user)
  tasks!: Tasks[];
}
