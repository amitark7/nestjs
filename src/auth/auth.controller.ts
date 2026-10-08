import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register.dto';
import { LoginUserDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { RefreshTokenDto } from './dto/refresh.dto';
import { CurrentUser } from 'src/common/decorators/current-user/current-user.decorator';
import { JwtAuthGuardGuard } from 'src/guards/jwt-auth-guard.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerUser(@Body() registerData: RegisterUserDto) {
    return this.authService.registerUser(registerData);
  }

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 100 : 5,
      ttl: 60000,
    },
  })
  @Post('login')
  loginUser(@Body() loginDto: LoginUserDto) {
    return this.authService.loginUser(loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuardGuard)
  @Post('logout')
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }
}
