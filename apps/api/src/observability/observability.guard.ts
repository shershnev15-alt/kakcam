import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

interface MetricsRequest {
  header(name: string): string | undefined;
}

export function metricsAccessAllowed(
  authorization: string | undefined,
  configuredToken: string | undefined,
  nodeEnvironment: string | undefined,
): boolean {
  if (!configuredToken) return nodeEnvironment !== 'production';
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(configuredToken);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class MetricsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MetricsRequest>();
    return metricsAccessAllowed(
      request.header('authorization'),
      process.env.METRICS_TOKEN,
      process.env.NODE_ENV,
    );
  }
}
