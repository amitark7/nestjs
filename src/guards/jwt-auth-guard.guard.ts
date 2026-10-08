import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuardGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization token is required');
    }

    const [type, token] = authHeader.split(' ');

    if (type != 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      const payload = {
        id: user.sub,
        email: user.email,
        role: user.role,
      };
      req.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
