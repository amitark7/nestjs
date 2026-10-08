import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/users/user.entity';
import { LoggerService } from 'src/logger/logger.service';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users) private readonly userRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(registerDto: RegisterUserDto) {
    this.loggerService.log('User Registering...');

    const existing = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
    });

    const createdUser = await this.userRepository.save(user);
    return {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      createdAt: createdUser.createdAt,
    };
  }

  async loginUser(loginDto: LoginUserDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(loginDto.password, user?.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, refreshToken, refreshTokenExpiresAt } =
      await this.generateTokens(user);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    user.refreshTokenExpiresAt = refreshTokenExpiresAt;

    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '7d') as JwtSignOptions['expiresIn'],
      },
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: number };

    // 1. Verify JWT
    try {
      payload = this.jwtService.verify<{
        sub: number;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Find user
    const user = await this.userRepository.findOne({
      where: {
        id: payload.sub,
      },
    });

    // 3. Check session
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 4. Check DB expiry
    if (
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    // 6. Detect reuse
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 7. Rotate tokens
    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt,
    } = await this.generateTokens(user);

    const newHash = await bcrypt.hash(newRefreshToken, 12);

    user.refreshTokenHash = newHash;

    user.refreshTokenExpiresAt = refreshTokenExpiresAt;

    await this.userRepository.save(user);

    // 9. Return new tokens
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;

    await this.userRepository.save(user);

    return {
      message: 'Logged out successfully',
    };
  }
}
