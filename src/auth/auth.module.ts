import { Inject, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/users/user.entity';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtAuthGuardGuard } from 'src/guards/jwt-auth-guard.guard';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuardGuard],
  exports: [JwtModule, JwtAuthGuardGuard],
})
export class AuthModule {}
