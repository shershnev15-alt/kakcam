import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import type {
  ClaimDecisionInput,
  ClaimEvidenceInput,
  PublicationDecisionInput,
  SubmitClaimInput,
} from './verification.validation';
import {
  missingPublicEligibilitySignals,
  publicPhotoEvidenceKinds,
  publicPlayerEligibilityWhere,
} from './publication.policy';
import { EvidenceStorageService } from './evidence-storage.service';

const ACTIVE_CLAIM_STATUSES = ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW'];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class VerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceStorageService) private readonly evidenceStorage: EvidenceStorageService,
  ) {}

  async onboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerifiedAt: true,
        profileClaims: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            evidence: { select: { kind: true } },
            identityChecks: { select: { status: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
            player: {
              select: {
                slug: true,
                accounts: {
                  where: {
                    provider: { in: ['STEAM', 'FACEIT'] },
                    verifiedAt: { not: null },
                    game: { is: { slug: 'cs2' } },
                  },
                  select: { provider: true },
                },
                publication: { select: { status: true, federation: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const claim = user.profileClaims[0] ?? null;
    const providers = new Set(claim?.player.accounts.map((account) => account.provider) ?? []);
    const published = claim?.player.publication?.status === 'PUBLISHED';
    return {
      emailVerified: Boolean(user.emailVerifiedAt),
      claimSubmitted: Boolean(claim),
      claimStatus: claim?.status ?? null,
      playerSlug: claim?.player.slug ?? null,
      photoSubmitted: Boolean(
        claim?.evidence.some((evidence) =>
          publicPhotoEvidenceKinds.includes(evidence.kind as never),
        ),
      ),
      identityApproved: claim?.identityChecks[0]?.status === 'APPROVED',
      identityStatus: claim?.identityChecks[0]?.status ?? null,
      steamVerified: providers.has('STEAM'),
      faceitVerified: providers.has('FACEIT'),
      federationApproved: published,
      manualApproval: published,
      federationName: claim?.player.publication?.federation.name ?? null,
    };
  }

  async playerVerification(slug: string) {
    const player = await this.prisma.player.findFirst({
      where: { AND: [{ slug }, publicPlayerEligibilityWhere] },
      select: {
        id: true,
        slug: true,
        nickname: true,
        aggregateVerificationLevel: true,
        publication: {
          select: {
            publicPhotoUrl: true,
            publishedAt: true,
            federation: { select: { id: true, slug: true, name: true, countryCode: true } },
          },
        },
        accounts: {
          where: {
            provider: { in: ['STEAM', 'FACEIT'] },
            verifiedAt: { not: null },
            game: { is: { slug: 'cs2' } },
          },
          select: { provider: true, handle: true, verifiedAt: true },
          orderBy: { provider: 'asc' },
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    const [verifications, effectiveAssertions, approvedClaims] = await Promise.all([
      this.prisma.verification.findMany({
        where: { subjectType: 'Player', subjectId: player.id, status: 'APPROVED' },
        select: {
          id: true,
          level: true,
          method: true,
          status: true,
          validUntil: true,
          decidedAt: true,
          evidence: { select: { kind: true, visibility: true, createdAt: true } },
        },
        orderBy: { level: 'desc' },
      }),
      this.prisma.fieldAssertion.count({
        where: { entityType: 'Player', entityId: player.id, status: 'EFFECTIVE' },
      }),
      this.prisma.profileClaim.count({ where: { playerId: player.id, status: 'APPROVED' } }),
    ]);
    return {
      player: { id: player.id, slug: player.slug, nickname: player.nickname },
      level: player.aggregateVerificationLevel,
      label: this.levelLabel(player.aggregateVerificationLevel),
      approvedClaim: approvedClaims > 0,
      effectiveAssertions,
      verifications,
      publication: player.publication,
      verifiedAccounts: player.accounts,
    };
  }

  async decidePublication(
    slug: string,
    input: PublicationDecisionInput,
    reviewerId: string,
    request: HttpRequest,
  ) {
    const player = await this.prisma.player.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        publication: { include: { verification: true, federation: true } },
        accounts: {
          where: {
            provider: { in: ['STEAM', 'FACEIT'] },
            verifiedAt: { not: null },
            game: { is: { slug: 'cs2' } },
          },
          select: { provider: true, verifiedAt: true },
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');

    if (input.decision === 'REVOKE') {
      if (!player.publication || player.publication.status !== 'PUBLISHED') {
        throw new ConflictException('Профиль уже закрыт для общего доступа');
      }
      await this.assertFederationReviewer(reviewerId, player.publication.federationId);
      const now = new Date();
      const publication = await this.prisma.$transaction(async (tx) => {
        await tx.verification.update({
          where: { id: player.publication!.verificationId },
          data: { status: 'REVOKED', reason: input.reason, decidedAt: now },
        });
        const revoked = await tx.playerPublication.update({
          where: { playerId: player.id },
          data: { status: 'REVOKED', revokedAt: now, reviewerId, reason: input.reason },
          include: { federation: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: reviewerId,
            action: 'player.publication.revoke',
            targetType: 'Player',
            targetId: player.id,
            reason: input.reason,
            diff: { before: { status: 'PUBLISHED' }, after: { status: 'REVOKED' } },
            requestId: this.requestId(request) ?? null,
          },
        });
        return revoked;
      });
      return this.publicationDto(publication, player.accounts);
    }

    await this.assertFederationReviewer(reviewerId, input.federationId);

    if (player.publication?.status === 'PUBLISHED') {
      if (
        player.publication.selfClaimId === input.selfClaimId &&
        player.publication.federationId === input.federationId &&
        player.publication.photoEvidenceId === input.photoEvidenceId &&
        (!input.publicPhotoUrl || player.publication.publicPhotoUrl === input.publicPhotoUrl)
      ) {
        return this.publicationDto(player.publication, player.accounts);
      }
      throw new ConflictException('Сначала отзовите действующую публикацию');
    }

    const [claim, federation, photoEvidence, identityCheck] = await Promise.all([
      this.prisma.profileClaim.findUnique({ where: { id: input.selfClaimId } }),
      this.prisma.organization.findUnique({ where: { id: input.federationId } }),
      this.prisma.verificationEvidence.findUnique({
        where: { id: input.photoEvidenceId },
        include: { blob: true },
      }),
      this.prisma.identityCheck.findFirst({
        where: { claimId: input.selfClaimId, status: 'APPROVED' },
      }),
    ]);
    const providers = new Set(player.accounts.map((account) => account.provider));
    const signals = {
      approvedSelfClaim:
        claim?.playerId === player.id && claim.userId.length > 0 && claim.status === 'APPROVED',
      federationApproval: federation?.isFederation === true,
      approvedPhoto: Boolean(
        photoEvidence &&
          claim &&
          photoEvidence.claimId === claim.id &&
          photoEvidence.visibility === 'RESTRICTED' &&
          publicPhotoEvidenceKinds.includes(
            photoEvidence.kind as (typeof publicPhotoEvidenceKinds)[number],
          ),
      ),
      verifiedSteam: providers.has('STEAM'),
      verifiedFaceit: providers.has('FACEIT'),
      identityApproved: Boolean(identityCheck),
    };
    const missing = missingPublicEligibilitySignals(signals);
    if (missing.length) {
      throw new ConflictException({
        message: 'Игрок не выполнил обязательные условия публикации',
        missing,
      });
    }

    const publicPhotoUrl = photoEvidence!.blob
      ? await this.evidenceStorage.publishProfilePhoto(photoEvidence!.id, player.slug)
      : input.publicPhotoUrl;
    if (!publicPhotoUrl) {
      throw new ConflictException('Для публикации требуется обработанная копия фотографии');
    }

    const now = new Date();
    const publication = await this.prisma.$transaction(async (tx) => {
      const verification = await tx.verification.create({
        data: {
          subjectType: 'Player',
          subjectId: player.id,
          level: 4,
          method: `FEDERATION:${federation!.slug}`,
          status: 'APPROVED',
          reviewerId,
          reason: input.reason,
          decidedAt: now,
        },
      });
      const published = await tx.playerPublication.upsert({
        where: { playerId: player.id },
        create: {
          playerId: player.id,
          selfClaimId: input.selfClaimId,
          federationId: input.federationId,
          photoEvidenceId: input.photoEvidenceId,
          verificationId: verification.id,
          reviewerId,
          status: 'PUBLISHED',
          publicPhotoUrl,
          reason: input.reason,
          publishedAt: now,
        },
        update: {
          selfClaimId: input.selfClaimId,
          federationId: input.federationId,
          photoEvidenceId: input.photoEvidenceId,
          verificationId: verification.id,
          reviewerId,
          status: 'PUBLISHED',
          publicPhotoUrl,
          reason: input.reason,
          publishedAt: now,
          revokedAt: null,
        },
        include: { federation: true },
      });
      await tx.playerProfile.upsert({
        where: { playerId: player.id },
        create: { playerId: player.id, avatarUrl: publicPhotoUrl },
        update: { avatarUrl: publicPhotoUrl },
      });
      await tx.player.update({
        where: { id: player.id },
        data: { aggregateVerificationLevel: Math.max(player.aggregateVerificationLevel, 4) },
      });
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'player.publication.publish',
          targetType: 'Player',
          targetId: player.id,
          reason: input.reason,
          diff: {
            after: {
              status: 'PUBLISHED',
              selfClaimId: input.selfClaimId,
              federationId: input.federationId,
              photoEvidenceChecksum: photoEvidence!.checksum,
              verifiedSteam: true,
              verifiedFaceit: true,
            },
          },
          requestId: this.requestId(request) ?? null,
        },
      });
      return published;
    });
    return this.publicationDto(publication, player.accounts);
  }

  async submitClaim(input: SubmitClaimInput, userId: string, request: HttpRequest) {
    const claimant = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (!claimant?.emailVerifiedAt) {
      throw new ForbiddenException('Сначала подтвердите email');
    }
    const player = await this.prisma.player.findFirst({
      where: { slug: input.playerSlug, status: 'ACTIVE' },
      select: { id: true, slug: true, nickname: true },
    });
    if (!player) throw new NotFoundException('Player not found');
    const active = await this.prisma.profileClaim.findFirst({
      where: { userId, playerId: player.id, status: { in: ACTIVE_CLAIM_STATUSES } },
    });
    if (active) throw new ConflictException('Активная заявка на этот профиль уже существует');
    const checksum = input.evidence
      ? sha256(`${userId}:${player.id}:${input.evidence.kind}:${input.evidence.reference}`)
      : null;
    const claim = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profileClaim.create({
        data: {
          userId,
          playerId: player.id,
          status: 'SUBMITTED',
          method: input.method,
          statement: input.statement ?? null,
          evidenceSummary: input.evidence
            ? { count: 1, kinds: [input.evidence.kind] }
            : { count: 0, kinds: [] },
          ...(input.evidence && checksum
            ? {
                evidence: {
                  create: {
                    submittedById: userId,
                    kind: input.evidence.kind,
                    reference: input.evidence.reference,
                    checksum,
                    visibility: 'RESTRICTED',
                  },
                },
              }
            : {}),
          moderationCase: { create: { status: 'OPEN', priority: 1 } },
        },
        include: {
          player: { select: { id: true, slug: true, nickname: true } },
          evidence: true,
          moderationCase: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'profile_claim.submit',
          targetType: 'ProfileClaim',
          targetId: created.id,
          diff: {
            after: {
              playerSlug: player.slug,
              method: input.method,
              evidenceKind: input.evidence?.kind ?? null,
              evidenceChecksum: checksum,
            },
          },
          requestId: this.requestId(request) ?? null,
        },
      });
      return created;
    });
    return this.claimDto(claim, false);
  }

  async addEvidence(
    claimId: string,
    evidence: ClaimEvidenceInput,
    userId: string,
    request: HttpRequest,
  ) {
    const claim = await this.prisma.profileClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.userId !== userId) throw new ForbiddenException('Это не ваша заявка');
    if (['APPROVED', 'REJECTED'].includes(claim.status)) {
      throw new ConflictException('Рассмотренная заявка закрыта');
    }
    const checksum = sha256(`${claimId}:${evidence.kind}:${evidence.reference}`);
    try {
      await this.prisma.$transaction([
        this.prisma.verificationEvidence.create({
          data: {
            claimId,
            submittedById: userId,
            kind: evidence.kind,
            reference: evidence.reference,
            checksum,
            visibility: 'RESTRICTED',
          },
        }),
        this.prisma.profileClaim.update({
          where: { id: claimId },
          data: { status: 'SUBMITTED', evidenceSummary: { appended: true, kind: evidence.kind } },
        }),
        this.prisma.moderationCase.update({
          where: { claimId },
          data: { status: 'OPEN', resolution: null, resolvedAt: null },
        }),
        this.prisma.auditLog.create({
          data: {
            actorId: userId,
            action: 'profile_claim.evidence.add',
            targetType: 'ProfileClaim',
            targetId: claimId,
            diff: { evidenceKind: evidence.kind, evidenceChecksum: checksum },
            requestId: this.requestId(request) ?? null,
          },
        }),
      ]);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Такое доказательство уже добавлено');
      }
      throw error;
    }
    return this.claimById(claimId, userId);
  }

  async myClaims(userId: string) {
    const claims = await this.prisma.profileClaim.findMany({
      where: { userId },
      include: {
        player: { select: { id: true, slug: true, nickname: true } },
        evidence: { include: { blob: true } },
        moderationCase: true,
        identityChecks: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return claims.map((claim) => this.claimDto(claim, false));
  }

  async moderationQueue(status: string) {
    const cases = await this.prisma.moderationCase.findMany({
      where: { status },
      include: {
        claim: {
          include: {
            claimant: { select: { id: true, email: true, displayName: true } },
            player: { select: { id: true, slug: true, nickname: true } },
            evidence: { include: { blob: true } },
            identityChecks: { orderBy: { updatedAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return cases.map((item) => ({
      id: item.id,
      status: item.status,
      priority: item.priority,
      createdAt: item.createdAt,
      claim: this.claimDto(
        { ...item.claim, moderationCase: { id: item.id, status: item.status } },
        true,
      ),
    }));
  }

  async decideClaim(
    claimId: string,
    input: ClaimDecisionInput,
    reviewerId: string,
    request: HttpRequest,
  ) {
    const claim = await this.prisma.profileClaim.findUnique({
      where: { id: claimId },
      include: {
        player: {
          include: {
            accounts: {
              where: { provider: { in: ['STEAM', 'FACEIT'] }, verifiedAt: { not: null } },
              select: { provider: true },
            },
          },
        },
        evidence: { include: { blob: true } },
        moderationCase: true,
        identityChecks: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (['APPROVED', 'REJECTED'].includes(claim.status)) {
      throw new ConflictException('Заявка уже рассмотрена');
    }
    if (input.decision === 'APPROVED') {
      const providers = new Set(claim.player.accounts.map((account) => account.provider));
      const missing = [
        !claim.evidence.some((item) => item.kind === 'PROFILE_PHOTO' && item.blob) ? 'PHOTO' : null,
        !providers.has('STEAM') ? 'STEAM' : null,
        !providers.has('FACEIT') ? 'FACEIT' : null,
        claim.identityChecks[0]?.status !== 'APPROVED' ? 'IDENTITY' : null,
      ].filter((item): item is string => item !== null);
      if (missing.length) {
        throw new ConflictException({
          message: 'Нельзя одобрить незавершённую заявку',
          missing,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const terminal = input.decision === 'APPROVED' || input.decision === 'REJECTED';
      await tx.profileClaim.update({
        where: { id: claim.id },
        data: {
          status: input.decision,
          reviewerId,
          decisionReason: input.reason,
          decidedAt: terminal ? new Date() : null,
        },
      });
      await tx.moderationCase.update({
        where: { claimId: claim.id },
        data: {
          status: terminal ? 'RESOLVED' : 'WAITING_EVIDENCE',
          assignedToId: reviewerId,
          resolution: input.reason,
          resolvedAt: terminal ? new Date() : null,
        },
      });

      if (input.decision === 'APPROVED') {
        const verification = await tx.verification.create({
          data: {
            subjectType: 'Player',
            subjectId: claim.playerId,
            level: 2,
            method: `PROFILE_CLAIM:${claim.method}`,
            status: 'APPROVED',
            reviewerId,
            reason: input.reason,
            decidedAt: new Date(),
          },
        });
        await tx.verificationEvidence.updateMany({
          where: { claimId: claim.id },
          data: { verificationId: verification.id },
        });
        await tx.player.update({
          where: { id: claim.playerId },
          data: {
            aggregateVerificationLevel: Math.max(claim.player.aggregateVerificationLevel, 2),
          },
        });
        const role = await tx.role.findUnique({ where: { code: 'VERIFIED_PLAYER' } });
        if (role) {
          const assigned = await tx.userRole.findFirst({
            where: { userId: claim.userId, roleId: role.id },
          });
          if (!assigned) {
            await tx.userRole.create({
              data: { userId: claim.userId, roleId: role.id, grantedById: reviewerId },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: `profile_claim.${input.decision.toLocaleLowerCase('en-US')}`,
          targetType: 'ProfileClaim',
          targetId: claim.id,
          reason: input.reason,
          diff: {
            before: { status: claim.status },
            after: { status: input.decision, evidenceCount: claim.evidence.length },
          },
          requestId: this.requestId(request) ?? null,
        },
      });
    });
    return this.claimById(claimId, reviewerId, true);
  }

  private async claimById(claimId: string, userId: string, moderator = false) {
    const claim = await this.prisma.profileClaim.findUnique({
      where: { id: claimId },
      include: {
        claimant: { select: { id: true, email: true, displayName: true } },
        player: { select: { id: true, slug: true, nickname: true } },
        evidence: { include: { blob: true } },
        moderationCase: true,
        identityChecks: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (!moderator && claim.userId !== userId) throw new ForbiddenException('Это не ваша заявка');
    return this.claimDto(claim, moderator);
  }

  private claimDto(
    claim: {
      id: string;
      status: string;
      method: string;
      statement: string | null;
      decisionReason: string | null;
      createdAt: Date;
      updatedAt: Date;
      player: { id: string; slug: string; nickname: string };
      claimant?: { id: string; email: string; displayName: string | null };
      evidence: Array<{
        id: string;
        kind: string;
        reference: string;
        checksum: string;
        visibility: string;
        createdAt: Date;
        blob?: {
          contentType: string;
          byteSize: number;
          scanStatus: string;
          originalName: string;
        } | null;
      }>;
      moderationCase: { id: string; status: string } | null;
      identityChecks?: Array<{ status: string; reviewAnswer: string | null }>;
    },
    moderator: boolean,
  ) {
    return {
      id: claim.id,
      status: claim.status,
      method: claim.method,
      statement: claim.statement,
      decisionReason: claim.decisionReason,
      player: claim.player,
      ...(moderator && claim.claimant ? { claimant: claim.claimant } : {}),
      evidence: claim.evidence.map((item) => ({
        id: item.id,
        kind: item.kind,
        ...(moderator ? { reference: item.reference } : {}),
        ...(moderator && item.blob
          ? {
              file: {
                originalName: item.blob.originalName,
                contentType: item.blob.contentType,
                byteSize: item.blob.byteSize,
                scanStatus: item.blob.scanStatus,
              },
              contentUrl: `/moderation/evidence/${item.id}/content`,
            }
          : {}),
        checksum: item.checksum,
        visibility: item.visibility,
        createdAt: item.createdAt,
      })),
      moderationStatus: claim.moderationCase?.status ?? null,
      identityStatus: claim.identityChecks?.[0]?.status ?? null,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };
  }

  private levelLabel(level: number): string {
    return [
      'Не подтверждён',
      'Аккаунт подключён',
      'Личность подтверждена',
      'Подтверждено организатором',
      'Официально подтверждено',
      'Проверено платформой',
    ][Math.max(0, Math.min(5, level))]!;
  }

  private publicationDto(
    publication: {
      id: string;
      status: string;
      publicPhotoUrl: string;
      publishedAt: Date | null;
      revokedAt: Date | null;
      federation?: { id: string; slug: string; name: string };
    },
    accounts: Array<{ provider: string; verifiedAt: Date | null }>,
  ) {
    const providers = new Set(
      accounts.filter((item) => item.verifiedAt).map((item) => item.provider),
    );
    return {
      id: publication.id,
      status: publication.status,
      publicPhotoUrl: publication.publicPhotoUrl,
      federation: publication.federation ?? null,
      verifiedSteam: providers.has('STEAM'),
      verifiedFaceit: providers.has('FACEIT'),
      publishedAt: publication.publishedAt,
      revokedAt: publication.revokedAt,
    };
  }

  private async assertFederationReviewer(reviewerId: string, federationId: string): Promise<void> {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId: reviewerId,
        role: { code: 'FEDERATION_REVIEWER' },
        scopeType: { in: ['ORGANIZATION', 'Organization'] },
        scopeId: federationId,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException('Нужна активная роль верификатора выбранной федерации');
    }
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : value?.[0]?.slice(0, 128);
  }
}
