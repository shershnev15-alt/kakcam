import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';

const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_MAX_ATTEMPTS = 10;

interface RateLimitState {
  key: string;
  attempts: number;
  windowStartAt: Date;
}

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  maxAttempts: number;
  windowStartAt: Date;
  windowResetAt: Date;
}

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly prisma: PrismaService) {}

  async consume(rawKey: string): Promise<RateLimitResult> {
    const key = this.normalizeKey(rawKey);
    try {
      return await this.consumeFromDatabase(key);
    } catch {
      return this.consumeFromMemory(key);
    }
  }

  private async consumeFromDatabase(key: string): Promise<RateLimitResult> {
    const windowSeconds = this.numberSetting(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS);
    const maxAttempts = this.numberSetting(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);

    const [row] = await this.prisma.$queryRaw<Array<RateLimitState & { subject: string }>>`
      INSERT INTO "AuthRateLimitBucket" (
        "subject",
        "attempts",
        "windowStartAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (${key}, 1, NOW(), NOW(), NOW())
      ON CONFLICT ("subject") DO UPDATE
      SET
        "attempts" = CASE
          WHEN "windowStartAt" < NOW() - (${windowSeconds}::float8 * interval '1 second')
          THEN 1
          ELSE "attempts" + 1
        END,
        "windowStartAt" = CASE
          WHEN "windowStartAt" < NOW() - (${windowSeconds}::float8 * interval '1 second')
          THEN NOW()
          ELSE "windowStartAt"
        END,
        "updatedAt" = NOW()
      RETURNING "subject", "attempts", "windowStartAt";
    `;

    const record = row ?? {
      attempts: 0,
      windowStartAt: new Date(),
      key,
    };
    const windowMs = windowSeconds * 1000;
    const windowResetAt = new Date(record.windowStartAt.getTime() + windowMs);
    return {
      attempts: record.attempts,
      maxAttempts,
      allowed: record.attempts <= maxAttempts,
      windowStartAt: record.windowStartAt,
      windowResetAt,
    };
  }

  private consumeFromMemory(key: string): RateLimitResult {
    const now = Date.now();
    const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS ?? DEFAULT_WINDOW_SECONDS) * 1000;
    const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        attempts: 1,
        maxAttempts,
        windowStartAt: new Date(now),
        windowResetAt: new Date(now + windowMs),
      };
    }

    const nextCount = current.count + 1;
    this.attempts.set(key, { count: nextCount, resetAt: current.resetAt });
    return {
      allowed: nextCount <= maxAttempts,
      attempts: nextCount,
      maxAttempts,
      windowStartAt: new Date(current.resetAt - windowMs),
      windowResetAt: new Date(current.resetAt),
    };
  }

  private numberSetting(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private normalizeKey(rawKey: string): string {
    const value = rawKey.length > 150 ? `${rawKey.slice(0, 140)}:${rawKey.length}` : rawKey;
    return createHash('sha256').update(value).digest('hex');
  }
}
