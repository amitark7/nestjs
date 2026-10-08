import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleGuard } from 'src/guards/role.guard';
import { JwtAuthGuardGuard } from 'src/guards/jwt-auth-guard.guard';
import { Roles } from 'src/auth/decorators/roles/roles.decorator';
import { UserRole } from './user.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user/current-user.decorator';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  getUsers(@Query('name') name: string) {
    return this.userService.getUsers(name);
  }

  @Get('me')
  @UseGuards(JwtAuthGuardGuard)
  getCurrentUser(@CurrentUser() user: any) {
    const userId = user.id;
    return this.userService.getCurrentUser(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Get(':id/tasks')
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  getUserTasks(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserTasks(id);
  }

  @Post()
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Post('seed')
  createUsers() {
    return this.userService.createUsers();
  }

  @Put(':id')
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuardGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }
}
