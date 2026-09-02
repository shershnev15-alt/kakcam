import { Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { ObservabilityService } from './observability.service';

export interface TelemetryRequest {
  header(name: string): string | undefined;
  method: string;
  originalUrl?: string;
  path: string;
  socket: { remoteAddress?: string };
}

interface TelemetryResponse {
  once(event: 'finish', listener: () => void): void;
  setHeader(name: string, value: string): void;
  statusCode: number;
}

type NextFunction = () => void;
type RequestHandler = (
  request: TelemetryRequest,
  response: TelemetryResponse,
  next: NextFunction,
) => void;

const logger = new Logger('HTTP');
const uuidPattern = /\/[0-9a-f]{8}-[0-9a-f-]{27,36}(?=\/|$)/gi;
const ipHashSalt = process.env.IP_HASH_SALT ?? randomUUID();

export function normalizeRoute(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path;
  return withoutQuery
    .replace(uuidPattern, '/:id')
    .replace(/\/(players|teams|tournaments)\/[^/]+(?=\/|$)/g, '/$1/:slug')
    .replace(/\/(imports|assertions|reports|users)\/[^/]+(?=\/|$)/g, '/$1/:id');
}

export function createRequestTelemetry(observability: ObservabilityService): RequestHandler {
  return (request: TelemetryRequest, response: TelemetryResponse, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();
    const supplied = request.header('x-request-id');
    const requestId =
      supplied && /^[a-zA-Z0-9._-]{1,128}$/.test(supplied) ? supplied : randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const route = normalizeRoute(request.originalUrl || request.path);
      observability.recordHttp(request.method, route, response.statusCode, durationMs / 1000);
      logger.log(
        JSON.stringify({
          type: 'http_request',
          requestId,
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        }),
      );
    });
    next();
  };
}

export function analyticsClientHash(request: Pick<TelemetryRequest, 'socket'>): string {
  const address = request.socket.remoteAddress ?? 'unknown';
  return createHash('sha256').update(`${ipHashSalt}:${address}`).digest('hex');
}
