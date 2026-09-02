import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import type { AdminResource, OrganizationInput, TournamentInput } from './admin.validation';
import type {
  parseAchievementUpdate,
  parseAdminListQuery,
  parseAssertion,
  parseAssertionDecision,
  parseImport,
  parseRoleAssignment,
  parseUserStatus,
} from './admin.validation';

type AdminQuery = ReturnType<typeof parseAdminListQuery>;
type AssertionInput = ReturnType<typeof parseAssertion>;
type AssertionDecision = ReturnType<typeof parseAssertionDecision>;
type ImportInput = ReturnType<typeof parseImport>;
type RoleAssignment = ReturnType<typeof parseRoleAssignment>;
type UserStatusInput = ReturnType<typeof parseUserStatus>;
type AchievementUpdate = ReturnType<typeof parseAchievementUpdate>;

type AdminRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  version: string | null;
  fields: Record<string, unknown>;
};

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async overview() {
    const [
      players,
      teams,
      matches,
      tournaments,
      openClaims,
      candidateAssertions,
      queuedImports,
      openReports,
      users,
      audit24h,
    ] = await this.prisma.$transaction([
      this.prisma.player.count({ where: { status: 'ACTIVE' } }),
      this.prisma.team.count({ where: { status: 'ACTIVE' } }),
      this.prisma.match.count(),
      this.prisma.tournament.count(),
      this.prisma.profileClaim.count({
        where: { status: { in: ['SUBMITTED', 'EVIDENCE_REQUESTED'] } },
      }),
      this.prisma.fieldAssertion.count({ where: { status: { in: ['CANDIDATE', 'CONFLICTED'] } } }),
      this.prisma.dataImport.count({
        where: {
          status: { in: ['QUEUED', 'FETCHING', 'MAPPING', 'VALIDATING', 'REVIEW', 'APPLYING'] },
        },
      }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1_000) } },
      }),
    ]);
    return {
      data: {
        totals: { players, teams, matches, tournaments, users },
        queues: { openClaims, candidateAssertions, queuedImports, openReports },
        activity: { audit24h },
      },
      meta: { source: 'postgresql', generatedAt: new Date() },
    };
  }

  async listResource(resource: AdminResource, query: AdminQuery) {
    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;
    const q = query.q;
    let result: { rows: AdminRow[]; total: number };

    switch (resource) {
      case 'players': {
        const where: Prisma.PlayerWhereInput = q
          ? {
              OR: [
                { nickname: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.player.findMany({
            where,
            include: { country: true, currentTeam: true, profile: true },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.player.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.nickname,
              item.profile?.realName ?? item.slug,
              item.status,
              item.updatedAt,
              {
                slug: item.slug,
                country: item.country?.code ?? null,
                team: item.currentTeam?.name ?? null,
                verificationLevel: item.aggregateVerificationLevel,
              },
            ),
          ),
        };
        break;
      }
      case 'teams': {
        const where: Prisma.TeamWhereInput = q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.team.findMany({
            where,
            include: { country: true, organization: true },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.team.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.name,
              `${item.shortName} · ${item.slug}`,
              item.status,
              item.updatedAt,
              {
                country: item.country?.code ?? null,
                organization: item.organization?.name ?? null,
                verificationLevel: item.aggregateVerificationLevel,
              },
            ),
          ),
        };
        break;
      }
      case 'matches': {
        const where: Prisma.MatchWhereInput = q
          ? {
              OR: [
                { stage: { contains: q, mode: 'insensitive' } },
                { tournament: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.match.findMany({
            where,
            include: { homeTeam: true, awayTeam: true, tournament: true },
            orderBy: { startsAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.match.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              `${item.homeTeam?.shortName ?? 'TBD'} — ${item.awayTeam?.shortName ?? 'TBD'}`,
              item.tournament?.name ?? item.stage ?? 'Матч',
              item.status,
              item.updatedAt,
              {
                startsAt: item.startsAt,
                bestOf: item.bestOf,
                score: item.homeScore === null ? null : `${item.homeScore}:${item.awayScore}`,
                verificationLevel: item.verificationLevel,
              },
            ),
          ),
        };
        break;
      }
      case 'tournaments': {
        const where: Prisma.TournamentWhereInput = q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.tournament.findMany({
            where,
            include: { game: true },
            orderBy: { startsAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.tournament.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.name,
              `${item.tier} · ${item.mode}`,
              this.tournamentStatus(item.startsAt, item.endsAt),
              item.updatedAt,
              {
                slug: item.slug,
                gameSlug: item.game.slug,
                tier: item.tier,
                mode: item.mode,
                startsAt: item.startsAt,
                endsAt: item.endsAt,
                prizePool: item.prizePool?.toString() ?? null,
                currency: item.currency,
              },
            ),
          ),
        };
        break;
      }
      case 'organizations': {
        const where: Prisma.OrganizationWhereInput = q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.organization.findMany({
            where,
            include: { _count: { select: { teams: true } } },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.organization.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(item.id, item.name, item.slug, 'ACTIVE', item.updatedAt, {
              countryCode: item.countryCode,
              website: item.website,
              teams: item._count.teams,
            }),
          ),
        };
        break;
      }
      case 'verification': {
        const where: Prisma.ProfileClaimWhereInput = q
          ? {
              OR: [
                { claimant: { email: { contains: q, mode: 'insensitive' } } },
                { player: { nickname: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.profileClaim.findMany({
            where,
            include: { claimant: true, player: true, evidence: true, moderationCase: true },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.profileClaim.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.player.nickname,
              item.claimant.email,
              item.status,
              item.updatedAt,
              {
                method: item.method,
                statement: item.statement,
                evidence: item.evidence.map((evidence) => ({
                  id: evidence.id,
                  kind: evidence.kind,
                  reference: evidence.reference,
                  checksum: evidence.checksum,
                })),
                priority: item.moderationCase?.priority ?? 0,
                decisionReason: item.decisionReason,
              },
            ),
          ),
        };
        break;
      }
      case 'assertions': {
        const where: Prisma.FieldAssertionWhereInput = q
          ? {
              OR: [
                { entityType: { contains: q, mode: 'insensitive' } },
                { fieldPath: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.fieldAssertion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.fieldAssertion.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              `${item.entityType}.${item.fieldPath}`,
              item.entityId,
              item.status,
              item.createdAt,
              {
                value: item.value,
                sourceId: item.sourceId,
                observedAt: item.observedAt,
                verificationLevel: item.verificationLevel,
              },
            ),
          ),
        };
        break;
      }
      case 'imports': {
        const where: Prisma.DataImportWhereInput = q
          ? {
              OR: [
                { externalKey: { contains: q, mode: 'insensitive' } },
                { source: { code: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.dataImport.findMany({
            where,
            include: { source: true, _count: { select: { records: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.dataImport.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.externalKey ?? item.checksum.slice(0, 12),
              item.source.name,
              item.status,
              item.completedAt ?? item.createdAt,
              {
                checksum: item.checksum,
                rawLocation: item.rawLocation,
                records: item._count.records,
                counters: item.counters,
                errors: item.errors,
              },
            ),
          ),
        };
        break;
      }
      case 'reports': {
        const where: Prisma.ReportWhereInput = q
          ? {
              OR: [
                { category: { contains: q, mode: 'insensitive' } },
                { details: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.report.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.report.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.category,
              `${item.targetType} · ${item.targetId}`,
              item.status,
              item.resolvedAt ?? item.createdAt,
              {
                details: item.details,
                resolution: item.resolution,
                reporterId: item.reporterId,
              },
            ),
          ),
        };
        break;
      }
      case 'users': {
        const where: Prisma.UserWhereInput = q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.user.findMany({
            where,
            include: { roles: { include: { role: true } }, _count: { select: { sessions: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.user.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.displayName ?? item.email,
              item.email,
              item.status,
              item.updatedAt,
              {
                locale: item.locale,
                roles: item.roles.map((role) => role.role.code),
                sessions: item._count.sessions,
                emailVerifiedAt: item.emailVerifiedAt,
              },
            ),
          ),
        };
        break;
      }
      case 'achievements': {
        const where: Prisma.AchievementWhereInput = q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.achievement.findMany({
            where,
            include: { _count: { select: { playerGrants: true, teamGrants: true } } },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.achievement.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(item.id, item.title, item.code, item.rarity, item.updatedAt, {
              description: item.description,
              category: item.category,
              ruleVersion: item.ruleVersion,
              rule: item.rule,
              grants: item._count.playerGrants + item._count.teamGrants,
            }),
          ),
        };
        break;
      }
      case 'ratings': {
        const where: Prisma.RatingRunWhereInput = q
          ? { formulaVersion: { contains: q, mode: 'insensitive' } }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.ratingRun.findMany({
            where,
            include: { _count: { select: { playerRatings: true, teamRatings: true } } },
            orderBy: { inputCutoff: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.ratingRun.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              `${item.engine} · ${item.formulaVersion}`,
              item.checksum.slice(0, 16),
              item.status,
              item.createdAt,
              {
                inputCutoff: item.inputCutoff,
                config: item.config,
                records: item._count.playerRatings + item._count.teamRatings,
              },
            ),
          ),
        };
        break;
      }
      case 'audit': {
        const where: Prisma.AuditLogWhereInput = q
          ? {
              OR: [
                { action: { contains: q, mode: 'insensitive' } },
                { targetType: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};
        const [items, total] = await this.prisma.$transaction([
          this.prisma.auditLog.findMany({
            where,
            include: { actor: { select: { email: true, displayName: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.auditLog.count({ where }),
        ]);
        result = {
          total,
          rows: items.map((item) =>
            this.row(
              item.id,
              item.action,
              `${item.targetType}${item.targetId ? ` · ${item.targetId}` : ''}`,
              'IMMUTABLE',
              item.createdAt,
              {
                actor: item.actor?.displayName ?? item.actor?.email ?? 'system',
                reason: item.reason,
                diff: item.diff,
                requestId: item.requestId,
              },
            ),
          ),
        };
        break;
      }
    }

    return {
      data: result.rows,
      meta: {
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        source: 'postgresql',
      },
    };
  }

  async createTournament(input: TournamentInput, actorId: string, request: HttpRequest) {
    const game = await this.prisma.game.findUnique({ where: { slug: input.gameSlug } });
    if (!game) throw new BadRequestException('Игра не найдена');
    return this.withAudit(
      actorId,
      request,
      'tournament.create',
      'Tournament',
      input.name,
      async (tx) => {
        return tx.tournament.create({
          data: {
            slug: input.slug,
            gameId: game.id,
            name: input.name,
            tier: input.tier,
            mode: input.mode,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            ...(input.prizePool !== undefined ? { prizePool: input.prizePool } : {}),
            ...(input.currency ? { currency: input.currency } : {}),
          },
        });
      },
    );
  }

  async updateTournament(
    id: string,
    input: TournamentInput,
    ifMatch: string | undefined,
    actorId: string,
    request: HttpRequest,
  ) {
    const before = await this.prisma.tournament.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Турнир не найден');
    this.assertVersion(before.updatedAt, ifMatch);
    const game = await this.prisma.game.findUnique({ where: { slug: input.gameSlug } });
    if (!game) throw new BadRequestException('Игра не найдена');
    return this.withAudit(
      actorId,
      request,
      'tournament.update',
      'Tournament',
      input.name,
      async (tx) =>
        tx.tournament.update({
          where: { id },
          data: {
            slug: input.slug,
            gameId: game.id,
            name: input.name,
            tier: input.tier,
            mode: input.mode,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            prizePool: input.prizePool ?? null,
            currency: input.currency ?? null,
          },
        }),
      id,
      { before },
    );
  }

  async createOrganization(input: OrganizationInput, actorId: string, request: HttpRequest) {
    return this.withAudit(
      actorId,
      request,
      'organization.create',
      'Organization',
      input.name,
      async (tx) => tx.organization.create({ data: input }),
    );
  }

  async updateOrganization(
    id: string,
    input: OrganizationInput,
    ifMatch: string | undefined,
    actorId: string,
    request: HttpRequest,
  ) {
    const before = await this.prisma.organization.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Организация не найдена');
    this.assertVersion(before.updatedAt, ifMatch);
    return this.withAudit(
      actorId,
      request,
      'organization.update',
      'Organization',
      input.name,
      async (tx) => tx.organization.update({ where: { id }, data: { ...input } }),
      id,
      { before },
    );
  }

  async createAssertion(input: AssertionInput, actorId: string, request: HttpRequest) {
    const source = input.sourceCode
      ? await this.prisma.dataSource.findUnique({ where: { code: input.sourceCode } })
      : null;
    if (input.sourceCode && !source) throw new BadRequestException('Источник не найден');
    return this.withAudit(
      actorId,
      request,
      'assertion.create',
      'FieldAssertion',
      input.reason,
      async (tx) =>
        tx.fieldAssertion.create({
          data: {
            entityType: input.entityType,
            entityId: input.entityId,
            fieldPath: input.fieldPath,
            value: input.value === null ? Prisma.JsonNull : (input.value as Prisma.InputJsonValue),
            sourceId: source?.id ?? null,
            authorId: actorId,
            observedAt: input.observedAt,
            verificationLevel: input.verificationLevel,
          },
        }),
    );
  }

  async resolveAssertion(
    id: string,
    input: AssertionDecision,
    actorId: string,
    request: HttpRequest,
  ) {
    const before = await this.prisma.fieldAssertion.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Assertion не найден');
    if (!['CANDIDATE', 'CONFLICTED'].includes(before.status))
      throw new ConflictException('Assertion уже рассмотрен');
    return this.prisma.$transaction(async (tx) => {
      if (input.status === 'EFFECTIVE') {
        await tx.fieldAssertion.updateMany({
          where: {
            entityType: before.entityType,
            entityId: before.entityId,
            fieldPath: before.fieldPath,
            status: 'EFFECTIVE',
            id: { not: id },
          },
          data: { status: 'SUPERSEDED' },
        });
      }
      const assertion = await tx.fieldAssertion.update({
        where: { id },
        data: { status: input.status },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'assertion.resolve',
          targetType: 'FieldAssertion',
          targetId: id,
          reason: input.reason,
          diff: { before: before.status, after: input.status },
          requestId: this.requestId(request) ?? null,
        },
      });
      return assertion;
    });
  }

  async createImport(input: ImportInput, actorId: string, request: HttpRequest) {
    const source = await this.prisma.dataSource.findUnique({ where: { code: input.sourceCode } });
    if (!source || !source.isActive) throw new BadRequestException('Активный источник не найден');
    try {
      return await this.withAudit(
        actorId,
        request,
        'import.queue',
        'DataImport',
        input.reason,
        async (tx) =>
          tx.dataImport.create({
            data: {
              sourceId: source.id,
              checksum: input.checksum,
              status: 'QUEUED',
              externalKey: input.externalKey ?? null,
              rawLocation: input.rawLocation ?? null,
            },
          }),
      );
    } catch (error) {
      if (this.errorCode(error) === 'P2002')
        throw new ConflictException('Импорт с таким checksum уже существует');
      throw error;
    }
  }

  async retryImport(id: string, reason: string, actorId: string, request: HttpRequest) {
    const before = await this.prisma.dataImport.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Импорт не найден');
    if (before.status !== 'FAILED')
      throw new ConflictException('Повторный запуск доступен только для FAILED');
    return this.withAudit(
      actorId,
      request,
      'import.retry',
      'DataImport',
      reason,
      async (tx) =>
        tx.dataImport.update({
          where: { id },
          data: { status: 'QUEUED', errors: Prisma.JsonNull, completedAt: null },
        }),
      id,
      { before },
    );
  }

  async resolveReport(id: string, resolution: string, actorId: string, request: HttpRequest) {
    const before = await this.prisma.report.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Жалоба не найдена');
    if (before.status !== 'OPEN') throw new ConflictException('Жалоба уже закрыта');
    return this.withAudit(
      actorId,
      request,
      'report.resolve',
      'Report',
      resolution,
      async (tx) =>
        tx.report.update({
          where: { id },
          data: { status: 'RESOLVED', resolution, resolvedAt: new Date() },
        }),
      id,
      { before },
    );
  }

  async assignRoles(id: string, input: RoleAssignment, actorId: string, request: HttpRequest) {
    if (id === actorId && !input.roleCodes.includes('SUPER_ADMIN')) {
      throw new BadRequestException('Нельзя снять SUPER_ADMIN с текущей учетной записи');
    }
    const [user, roles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.role.findMany({ where: { code: { in: input.roleCodes } } }),
    ]);
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (roles.length !== input.roleCodes.length)
      throw new BadRequestException('Одна или несколько ролей не найдены');
    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: id, roleId: role.id, grantedById: actorId })),
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'user.roles.update',
          targetType: 'User',
          targetId: id,
          reason: input.reason,
          diff: { before: user.roles.map((item) => item.role.code), after: input.roleCodes },
          requestId: this.requestId(request) ?? null,
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
    });
  }

  async updateUserStatus(
    id: string,
    input: UserStatusInput,
    actorId: string,
    request: HttpRequest,
  ) {
    if (id === actorId && input.status !== 'ACTIVE')
      throw new BadRequestException('Нельзя заблокировать текущую учетную запись');
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Пользователь не найден');
    return this.withAudit(
      actorId,
      request,
      'user.status.update',
      'User',
      input.reason,
      async (tx) => {
        if (input.status !== 'ACTIVE')
          await tx.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        return tx.user.update({ where: { id }, data: { status: input.status } });
      },
      id,
      { before },
    );
  }

  async updateAchievement(
    id: string,
    input: AchievementUpdate,
    ifMatch: string | undefined,
    actorId: string,
    request: HttpRequest,
  ) {
    const before = await this.prisma.achievement.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Достижение не найдено');
    this.assertVersion(before.updatedAt, ifMatch);
    const data: Prisma.AchievementUpdateInput = {};
    if (input.title) data.title = input.title;
    if (input.description) data.description = input.description;
    if (input.rarity) data.rarity = input.rarity;
    if (input.rule !== undefined) data.rule = input.rule as Prisma.InputJsonValue;
    if (input.ruleVersion !== undefined) data.ruleVersion = input.ruleVersion;
    return this.withAudit(
      actorId,
      request,
      'achievement.update',
      'Achievement',
      input.reason,
      async (tx) => tx.achievement.update({ where: { id }, data }),
      id,
      { before },
    );
  }

  async archiveEntity(
    type: 'player' | 'team',
    id: string,
    reason: string,
    actorId: string,
    request: HttpRequest,
  ) {
    if (type === 'player') {
      const before = await this.prisma.player.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Игрок не найден');
      if (before.status === 'ARCHIVED') throw new ConflictException('Игрок уже архивирован');
      return this.withAudit(
        actorId,
        request,
        'player.archive',
        'Player',
        reason,
        async (tx) => tx.player.update({ where: { id }, data: { status: 'ARCHIVED' } }),
        id,
        { before },
      );
    }
    const before = await this.prisma.team.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Команда не найдена');
    if (before.status === 'ARCHIVED') throw new ConflictException('Команда уже архивирована');
    return this.withAudit(
      actorId,
      request,
      'team.archive',
      'Team',
      reason,
      async (tx) => tx.team.update({ where: { id }, data: { status: 'ARCHIVED' } }),
      id,
      { before },
    );
  }

  private row(
    id: string,
    title: string,
    subtitle: string,
    status: string,
    version: Date | null,
    fields: Record<string, unknown>,
  ): AdminRow {
    return { id, title, subtitle, status, version: version?.toISOString() ?? null, fields };
  }

  private tournamentStatus(startsAt: Date, endsAt: Date): string {
    const now = Date.now();
    if (now < startsAt.getTime()) return 'UPCOMING';
    if (now > endsAt.getTime()) return 'FINISHED';
    return 'LIVE';
  }

  private assertVersion(updatedAt: Date, ifMatch: string | undefined): void {
    if (!ifMatch)
      throw new PreconditionFailedException('Для изменения нужен If-Match из текущей версии');
    if (ifMatch.replaceAll('"', '') !== updatedAt.toISOString()) {
      throw new PreconditionFailedException('Запись изменилась. Обновите preview');
    }
  }

  private async withAudit<T>(
    actorId: string,
    request: HttpRequest,
    action: string,
    targetType: string,
    reason: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    targetId?: string,
    diff?: unknown,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const result = await operation(tx);
      const inferredId =
        result && typeof result === 'object' && 'id' in result && typeof result.id === 'string'
          ? result.id
          : targetId;
      await tx.auditLog.create({
        data: {
          actorId,
          action,
          targetType,
          targetId: targetId ?? inferredId ?? null,
          reason,
          ...(diff === undefined ? {} : { diff: diff as Prisma.InputJsonValue }),
          requestId: this.requestId(request) ?? null,
        },
      });
      return result;
    });
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : value?.[0]?.slice(0, 128);
  }

  private errorCode(error: unknown): string | undefined {
    return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  }
}
