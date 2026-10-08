import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoggerService } from 'src/logger/logger.service';
import { RedisService } from 'src/redis/redis.service';
import { UserResponseDto } from './dto/response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private readonly userRepository: Repository<Users>,
    private readonly redisService: RedisService,
    private readonly loggerService: LoggerService,
  ) {}

  async getUsers(name?: string) {
    this.loggerService.log('Fetching User....');
    const cacheKey = ['users', `name:${name ?? ''}`].join(':');

    const cachedUsers = await this.redisService.get(cacheKey);

    if (cachedUsers) {
      this.loggerService.log('CACHE HIT');
      return cachedUsers;
    }

    this.loggerService.log('CACHE MISS');

    const users = await this.userRepository.find();
    let result = users;

    if (name) {
      this.loggerService.log('Fetching user by name.....');
      result = users.filter((user) =>
        user.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    try {
      await this.redisService.set(cacheKey, result, 60000);
    } catch (error) {
      this.loggerService.error(`Failed to set users cache`, error);
    }
    return result;
  }

  async getCurrentUser(userId: number) {
    this.loggerService.log('Fetching current user data');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User not found with id ${userId}`);
    }
    return this.toUserResponse(user);
  }

  async getUserById(id: number) {
    this.loggerService.log(`Fetching User by id: ${id}`);
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User not found with id ${id}`);
    }
    return user;
  }

  async createUser(userData: CreateUserDto) {
    try {
      const user = this.userRepository.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      });

      const savedUser = await this.userRepository.save(user);
      try {
        await this.redisService.deleteUserCache();
      } catch (error) {
        this.loggerService.error('Failed to invalidate users cache', error);
      }
      return {
        message: 'User created Succesfully',
        user: this.toUserResponse(savedUser),
      };
    } catch (error) {
      this.loggerService.log('Failed to create user', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async createUsers() {
    const users = [];
    this.userRepository.save(users);
  }

  async updateUser(id: number, userData: UpdateUserDto) {
    this.loggerService.log('Updating User by id :', id);
    const result = await this.userRepository.update(id, userData);
    if (result.affected == 0) {
      throw new NotFoundException(`User not found with id ${id}`);
    }
    try {
      await this.redisService.deleteUserCache();
    } catch (error) {
      this.loggerService.error('Failed to invalidate users cache', error);
    }
    return { message: 'User Updated Successfully...' };
  }

  async deleteUser(id: number) {
    this.loggerService.log('Deleting user by id :', id);
    const result = await this.userRepository.softDelete({ id });
    if (result.affected == 0) {
      throw new NotFoundException(`User not found with id ${id}`);
    }
    try {
      await this.redisService.deleteUserCache();
    } catch (error) {
      this.loggerService.error('Failed to invalidate users cache', error);
    }
    return { message: 'User Deleted Successfully...' };
  }

  async getUserTasks(userId: number) {
    this.loggerService.log(`Fetching task for userId ${userId}`);
    const cacheKey = `user:${userId}:tasks`;

    // 1. Check Redis
    const cachedUser = await this.redisService.get(cacheKey);

    if (cachedUser) {
      this.loggerService.log('CACHE HIT');
      return cachedUser;
    }

    this.loggerService.log('CACHE MISS');

    let user: any;
    try {
      user = await this.userRepository.findOne({
        where: { id: userId },
        relations: { tasks: true },
      });
    } catch (error) {
      this.loggerService.error('Failed to get task', error);
      throw new InternalServerErrorException(`Failed to fetch task`);
    }

    if (!user) {
      throw new NotFoundException(`User with id ${userId} does not exist`);
    }

    try {
      await this.redisService.set(cacheKey, user, 60000);
    } catch (error) {
      this.loggerService.error('Failed to set user tasks cache', error);
    }

    return user;
  }

  private toUserResponse(user: Users): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
