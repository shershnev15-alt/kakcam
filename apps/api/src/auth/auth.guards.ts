import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { HttpRequest } from '../http.types';
import { AuthService } from './auth.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import type { AuthenticatedRequest } from './auth.types';
import { PERMISSIONS_KEY } from './auth.decorators';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.auth.authenticate(context.switchToHttp().getRequest<AuthenticatedRequest>());
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      !request.auth ||
      !required.every((permission) => request.auth!.permissions.includes(permission))
    ) {
      throw new ForbiddenException('Недостаточно прав');
    }
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const originValue = request.headers.origin;
    const origin = typeof originValue === 'string' ? originValue : originValue?.[0];
    const allowedOrigins = (process.env.APP_ORIGIN ?? 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((item) => item.trim());
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Недопустимый Origin');
    }
    return true;
  }
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: AuthRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const key = `${request.ip}:${request.route?.path ?? request.path}`;
    const result = await this.rateLimit.consume(key);
    if (!result.allowed) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
