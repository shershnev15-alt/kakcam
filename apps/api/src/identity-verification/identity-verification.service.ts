import {
  BadGatewayException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

type SumsubWebhook = {
  applicantId?: string;
  externalUserId?: string;
  type?: string;
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer?: string;
    reviewRejectType?: string;
    rejectLabels?: string[];
  };
};

@Injectable()
export class IdentityVerificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createSession(claimId: string, userId: string) {
    const claim = await this.prisma.profileClaim.findUnique({
      where: { id: claimId },
      include: { claimant: { select: { email: true, emailVerifiedAt: true } } },
    });
    if (!claim) throw new NotFoundException('Заявка не найдена');
    if (claim.userId !== userId) throw new ForbiddenException('Это не ваша заявка');
    if (!claim.claimant.emailVerifiedAt) throw new ForbiddenException('Сначала подтвердите email');
    if (['APPROVED', 'REJECTED'].includes(claim.status)) {
      throw new ForbiddenException('Проверка личности для закрытой заявки недоступна');
    }

    const externalUserId = `cyberid:${userId}:${claimId}`;
    const check = await this.prisma.identityCheck.upsert({
      where: { externalUserId },
      create: { userId, claimId, provider: 'SUMSUB', externalUserId, status: 'CREATED' },
      update: { status: 'CREATED', reviewAnswer: null, rejectLabels: Prisma.DbNull },
    });
    const webSdkUrl = await this.createSumsubLink(externalUserId, claim.claimant.email);
    return { id: check.id, provider: 'SUMSUB', status: check.status, webSdkUrl };
  }

  async statusForUser(userId: string) {
    const check = await this.prisma.identityCheck.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return check
      ? {
          id: check.id,
          provider: check.provider,
          status: check.status,
          reviewAnswer: check.reviewAnswer,
          rejectLabels: check.rejectLabels,
          completedAt: check.completedAt,
        }
      : null;
  }

  async handleSumsubWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    this.verifyWebhook(rawBody, headers);
    let payload: SumsubWebhook;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as SumsubWebhook;
    } catch {
      throw new UnauthorizedException('Некорректный webhook payload');
    }
    if (!payload.externalUserId) throw new UnauthorizedException('Webhook без externalUserId');
    const check = await this.prisma.identityCheck.findUnique({
      where: { externalUserId: payload.externalUserId },
      include: { claim: { include: { player: true } } },
    });
    if (!check) return { accepted: true, ignored: true };

    const answer = payload.reviewResult?.reviewAnswer ?? null;
    const status =
      payload.type !== 'applicantReviewed'
        ? 'PENDING'
        : answer === 'GREEN'
          ? 'APPROVED'
          : payload.reviewResult?.reviewRejectType === 'RETRY'
            ? 'ACTION_REQUIRED'
            : 'REJECTED';
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.identityCheck.update({
        where: { id: check.id },
        data: {
          applicantId: payload.applicantId ?? check.applicantId,
          status,
          reviewAnswer: answer,
          rejectLabels: (payload.reviewResult?.rejectLabels ?? []) as Prisma.InputJsonValue,
          completedAt: ['APPROVED', 'REJECTED'].includes(status) ? now : null,
        },
      });
      if (status === 'APPROVED') {
        const existing = await tx.verification.findFirst({
          where: {
            subjectType: 'Player',
            subjectId: check.claim.playerId,
            method: 'SUMSUB_DOCUMENT_FACE_LIVENESS',
            status: 'APPROVED',
          },
        });
        if (!existing) {
          await tx.verification.create({
            data: {
              subjectType: 'Player',
              subjectId: check.claim.playerId,
              level: 3,
              method: 'SUMSUB_DOCUMENT_FACE_LIVENESS',
              status: 'APPROVED',
              reason: 'Sumsub applicantReviewed GREEN',
              decidedAt: now,
            },
          });
        }
        await tx.player.update({
          where: { id: check.claim.playerId },
          data: {
            aggregateVerificationLevel: Math.max(check.claim.player.aggregateVerificationLevel, 3),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          action: 'identity.sumsub.webhook',
          targetType: 'IdentityCheck',
          targetId: check.id,
          diff: {
            type: payload.type ?? null,
            status,
            answer,
            applicantIdHash: payload.applicantId
              ? createHmac('sha256', this.sumsubWebhookSecret())
                  .update(payload.applicantId)
                  .digest('hex')
              : null,
          },
        },
      });
    });
    return { accepted: true, status };
  }

  private async createSumsubLink(externalUserId: string, email: string): Promise<string> {
    const levelName = process.env.SUMSUB_LEVEL_NAME?.trim();
    if (!levelName) throw new ServiceUnavailableException('SUMSUB_LEVEL_NAME не настроен');
    const path = '/resources/sdkIntegrations/levels/-/websdkLink?lang=ru&source=api';
    const publicWeb = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000';
    const body = JSON.stringify({
      levelName,
      userId: externalUserId,
      applicantIdentifiers: { email },
      redirect: {
        successUrl: `${publicWeb}/account?identity=completed`,
        rejectUrl: `${publicWeb}/account?identity=action-required`,
      },
      ttlInSecs: 1800,
    });
    const response = await this.sumsubRequest(path, body);
    const result = (await response.json()) as { url?: string };
    if (!result.url) throw new BadGatewayException('Sumsub не вернул WebSDK URL');
    return result.url;
  }

  private async sumsubRequest(path: string, body: string): Promise<Response> {
    const appToken = process.env.SUMSUB_APP_TOKEN?.trim();
    const secret = process.env.SUMSUB_SECRET_KEY?.trim();
    if (!appToken || !secret) throw new ServiceUnavailableException('Sumsub API не настроен');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}POST${path}${body}`)
      .digest('hex');
    const baseUrl = process.env.SUMSUB_API_BASE_URL?.trim() ?? 'https://api.sumsub.com';
    const response = await fetch(new URL(path, baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': timestamp,
        'X-App-Access-Sig': signature,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new BadGatewayException('Sumsub API отклонил запрос');
    return response;
  }

  private verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const digest = this.header(headers, 'x-payload-digest');
    const algorithm = this.header(headers, 'x-payload-digest-alg');
    const nodeAlgorithm =
      algorithm === 'HMAC_SHA256_HEX'
        ? 'sha256'
        : algorithm === 'HMAC_SHA512_HEX'
          ? 'sha512'
          : null;
    if (!digest || !nodeAlgorithm) throw new UnauthorizedException('Подпись webhook отсутствует');
    const expected = createHmac(nodeAlgorithm, this.sumsubWebhookSecret()).update(rawBody).digest();
    const received = Buffer.from(digest, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException('Подпись webhook недействительна');
    }
  }

  private sumsubWebhookSecret(): string {
    const secret = process.env.SUMSUB_WEBHOOK_SECRET?.trim();
    if (!secret) throw new ServiceUnavailableException('SUMSUB_WEBHOOK_SECRET не настроен');
    return secret;
  }

  private header(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLocaleLowerCase('en-US')];
    return Array.isArray(value) ? value[0] : value;
  }
}
