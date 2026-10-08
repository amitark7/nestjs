import { PartialType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './register.dto';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;
}
