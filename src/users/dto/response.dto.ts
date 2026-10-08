import { UserRole } from '../user.entity';

export class UserResponseDto {
  id!: number;
  name!: string;
  email!: string;
  role!: UserRole;
  createdAt!: Date;
}
