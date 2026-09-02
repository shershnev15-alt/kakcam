import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import type {
  CreatePlayerInput,
  CreateTeamInput,
  UpdatePlayerInput,
  UpdateTeamInput,
} from './entities.validation';
import type { DirectoryQuery } from './directory.validation';

const playerInclude = {
  country: { select: { code: true, name: true } },
  currentTeam: { select: { id: true, slug: true, name: true, shortName: true } },
  profile: { select: { realName: true, birthDate: true } },
  ratings: {
    orderBy: { publishedAt: 'desc' as const },
    take: 1,
    select: {
      score: true,
      confidence: true,
      rank: true,
      explanation: true,
      publishedAt: true,
    },
  },
} satisfies Prisma.PlayerInclude;

const teamInclude = {
  country: { select: { code: true, name: true } },
  ratings: {
    orderBy: { publishedAt: 'desc' as const },
    take: 1,
    select: {
      score: true,
      confidence: true,
      rank: true,
      explanation: true,
      publishedAt: true,
    },
  },
} satisfies Prisma.TeamInclude;

const teamDetailInclude = {
  ...teamInclude,
  currentPlayers: {
    where: { status: 'ACTIVE' as const },
    include: playerInclude,
    orderBy: { nickname: 'asc' as const },
  },
} satisfies Prisma.TeamInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;
type TeamRecord = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;
type TeamDetailRecord = Prisma.TeamGetPayload<{ include: typeof teamDetailInclude }>;

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function stringList(value: Prisma.JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function numberList(value: Prisma.JsonValue | undefined): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];
}

@Injectable()
export class EntitiesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPlayers(query: DirectoryQuery) {
    const where = this.playerWhere(query);
    if (query.sort === 'rating') {
      const run = await this.prisma.ratingRun.findFirst({
        where: { engine: 'PPR', status: 'PUBLISHED' },
        orderBy: { inputCutoff: 'desc' },
      });
      if (!run) return this.page([], 0, query);
      const [ratings, total] = await this.prisma.$transaction([
        this.prisma.playerRating.findMany({
          where: { runId: run.id, player: where },
          include: { player: { include: playerInclude } },
          orderBy: { score: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.playerRating.count({ where: { runId: run.id, player: where } }),
      ]);
      return this.page(
        ratings.map((item) => this.playerDto(item.player)),
        total,
        query,
      );
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.player.findMany({
        where,
        include: playerInclude,
        orderBy:
          query.sort === 'verified'
            ? [{ aggregateVerificationLevel: 'desc' }, { nickname: 'asc' }]
            : { nickname: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.player.count({ where }),
    ]);
    return this.page(
      records.map((record) => this.playerDto(record)),
      total,
      query,
    );
  }

  async playerBySlug(slug: string) {
    const record = await this.prisma.player.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: playerInclude,
    });
    if (!record) throw new NotFoundException('Player not found');
    const similar = await this.prisma.player.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: record.id },
        ...(record.currentTeamId ? { currentTeamId: record.currentTeamId } : {}),
      },
      include: playerInclude,
      orderBy: { aggregateVerificationLevel: 'desc' },
      take: 4,
    });
    return {
      ...this.playerDto(record),
      similar: similar.map((item) => this.playerDto(item)),
    };
  }

  async createPlayer(input: CreatePlayerInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const player = await tx.player.create({
          data: {
            slug: input.slug,
            nickname: input.nickname,
            normalizedNickname: input.nickname.toLocaleLowerCase('ru-RU'),
            ...(input.countryCode ? { country: { connect: { code: input.countryCode } } } : {}),
            ...(input.realName ? { profile: { create: { realName: input.realName } } } : {}),
          },
          include: playerInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'player.create',
            targetType: 'Player',
            targetId: player.id,
            diff: { after: input },
            requestId: this.requestId(request) ?? null,
          },
        });
        return player;
      });
      return this.playerDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Игрок с таким slug уже существует');
    }
  }

  async updatePlayer(
    slug: string,
    input: UpdatePlayerInput,
    actorId: string,
    request: HttpRequest,
  ) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const before = await tx.player.findUnique({ where: { slug }, include: playerInclude });
        if (!before) throw new NotFoundException('Player not found');
        const data: Prisma.PlayerUpdateInput = {};
        if (input.nickname) {
          data.nickname = input.nickname;
          data.normalizedNickname = input.nickname.toLocaleLowerCase('ru-RU');
        }
        if (input.countryCode) data.country = { connect: { code: input.countryCode } };
        if (input.realName)
          data.profile = {
            upsert: { create: { realName: input.realName }, update: { realName: input.realName } },
          };
        const player = await tx.player.update({ where: { slug }, data, include: playerInclude });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'player.update',
            targetType: 'Player',
            targetId: player.id,
            diff: { before: this.playerDto(before), after: this.playerDto(player) },
            requestId: this.requestId(request) ?? null,
          },
        });
        return player;
      });
      return this.playerDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Не удалось обновить игрока');
    }
  }

  async archivePlayer(slug: string, actorId: string, request: HttpRequest) {
    const record = await this.prisma.$transaction(async (tx) => {
      const before = await tx.player.findFirst({
        where: { slug, status: 'ACTIVE' },
        include: playerInclude,
      });
      if (!before) throw new NotFoundException('Player not found');
      const player = await tx.player.update({
        where: { id: before.id },
        data: { status: 'ARCHIVED' },
        include: playerInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'player.archive',
          targetType: 'Player',
          targetId: player.id,
          diff: { before: this.playerDto(before), after: this.playerDto(player) },
          requestId: this.requestId(request) ?? null,
        },
      });
      return player;
    });
    return this.playerDto(record);
  }

  async listTeams(query: DirectoryQuery) {
    const where = this.teamWhere(query);
    if (query.sort === 'rating') {
      const run = await this.prisma.ratingRun.findFirst({
        where: { engine: 'TPR', status: 'PUBLISHED' },
        orderBy: { inputCutoff: 'desc' },
      });
      if (!run) return this.page([], 0, query);
      const [ratings, total] = await this.prisma.$transaction([
        this.prisma.teamRating.findMany({
          where: { runId: run.id, team: where },
          include: { team: { include: teamInclude } },
          orderBy: { score: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.teamRating.count({ where: { runId: run.id, team: where } }),
      ]);
      return this.page(
        ratings.map((item) => this.teamDto(item.team)),
        total,
        query,
      );
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: teamInclude,
        orderBy:
          query.sort === 'verified'
            ? [{ aggregateVerificationLevel: 'desc' }, { name: 'asc' }]
            : { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);
    return this.page(
      records.map((record) => this.teamDto(record)),
      total,
      query,
    );
  }

  async teamBySlug(slug: string) {
    const record = await this.prisma.team.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: teamDetailInclude,
    });
    if (!record) throw new NotFoundException('Team not found');
    return this.teamDetailDto(record);
  }

  async search(query: string) {
    const [players, teams] = await Promise.all([
      this.prisma.player.findMany({
        where: this.playerWhere({ page: 1, pageSize: 6, sort: 'rating', q: query }),
        include: playerInclude,
        orderBy: { aggregateVerificationLevel: 'desc' },
        take: 6,
      }),
      this.prisma.team.findMany({
        where: this.teamWhere({ page: 1, pageSize: 6, sort: 'rating', q: query }),
        include: teamInclude,
        orderBy: { aggregateVerificationLevel: 'desc' },
        take: 6,
      }),
    ]);
    return {
      players: players.map((item) => this.playerDto(item)),
      teams: teams.map((item) => this.teamDto(item)),
      total: players.length + teams.length,
    };
  }

  async createTeam(input: CreateTeamInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            slug: input.slug,
            name: input.name,
            shortName: input.shortName,
            ...(input.countryCode ? { country: { connect: { code: input.countryCode } } } : {}),
          },
          include: teamInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'team.create',
            targetType: 'Team',
            targetId: team.id,
            diff: { after: input },
            requestId: this.requestId(request) ?? null,
          },
        });
        return team;
      });
      return this.teamDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Команда с таким slug уже существует');
    }
  }

  async updateTeam(slug: string, input: UpdateTeamInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const before = await tx.team.findUnique({ where: { slug }, include: teamInclude });
        if (!before) throw new NotFoundException('Team not found');
        const data: Prisma.TeamUpdateInput = {};
        if (input.name) data.name = input.name;
        if (input.shortName) data.shortName = input.shortName;
        if (input.countryCode) data.country = { connect: { code: input.countryCode } };
        const team = await tx.team.update({ where: { slug }, data, include: teamInclude });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'team.update',
            targetType: 'Team',
            targetId: team.id,
            diff: { before: this.teamDto(before), after: this.teamDto(team) },
            requestId: this.requestId(request) ?? null,
          },
        });
        return team;
      });
      return this.teamDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Не удалось обновить команду');
    }
  }

  async archiveTeam(slug: string, actorId: string, request: HttpRequest) {
    const record = await this.prisma.$transaction(async (tx) => {
      const before = await tx.team.findFirst({
        where: { slug, status: 'ACTIVE' },
        include: teamInclude,
      });
      if (!before) throw new NotFoundException('Team not found');
      const team = await tx.team.update({
        where: { id: before.id },
        data: { status: 'ARCHIVED' },
        include: teamInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'team.archive',
          targetType: 'Team',
          targetId: team.id,
          diff: { before: this.teamDto(before), after: this.teamDto(team) },
          requestId: this.requestId(request) ?? null,
        },
      });
      return team;
    });
    return this.teamDto(record);
  }

  private playerDto(player: PlayerRecord) {
    const ratingRecord = player.ratings[0];
    const explanation = jsonObject(ratingRecord?.explanation);
    const age = player.profile?.birthDate
      ? new Date().getUTCFullYear() - player.profile.birthDate.getUTCFullYear()
      : null;
    return {
      id: player.id,
      slug: player.slug,
      nickname: player.nickname,
      realName: player.profile?.realName ?? null,
      age,
      status: player.status,
      verificationLevel: player.aggregateVerificationLevel,
      country: player.country,
      countryCode: player.country?.code ?? 'XX',
      countryName: player.country?.name ?? 'Не указана',
      currentTeam: player.currentTeam,
      teamId: player.currentTeam?.id ?? null,
      teamName: player.currentTeam?.name ?? 'Без команды',
      teamShortName: player.currentTeam?.shortName ?? '—',
      roles: stringList(explanation.roles).length ? stringList(explanation.roles) : ['Player'],
      rating: {
        score: ratingRecord?.score ?? 0,
        confidence: Math.round(Number(ratingRecord?.confidence ?? 0)),
        rank: ratingRecord?.rank ?? 0,
        delta7d: typeof explanation.delta7d === 'number' ? explanation.delta7d : 0,
        delta30d: typeof explanation.delta30d === 'number' ? explanation.delta30d : 0,
        tier: typeof explanation.tier === 'string' ? explanation.tier : 'Unrated',
      },
      form: numberList(explanation.form),
      ratingPublishedAt: ratingRecord?.publishedAt ?? null,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  private teamDto(team: TeamRecord) {
    const ratingRecord = team.ratings[0];
    const explanation = jsonObject(ratingRecord?.explanation);
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName,
      status: team.status,
      verificationLevel: team.aggregateVerificationLevel,
      country: team.country,
      countryCode: team.country?.code ?? 'XX',
      countryName: team.country?.name ?? 'Не указана',
      foundedYear: team.foundedAt?.getUTCFullYear() ?? null,
      rating: {
        score: ratingRecord?.score ?? 0,
        confidence: Math.round(Number(ratingRecord?.confidence ?? 0)),
        rank: ratingRecord?.rank ?? 0,
        delta7d: typeof explanation.delta7d === 'number' ? explanation.delta7d : 0,
        delta30d: typeof explanation.delta30d === 'number' ? explanation.delta30d : 0,
        tier: typeof explanation.tier === 'string' ? explanation.tier : 'Unrated',
      },
      form: stringList(explanation.form).filter(
        (item): item is 'W' | 'L' => item === 'W' || item === 'L',
      ),
      ratingPublishedAt: ratingRecord?.publishedAt ?? null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private teamDetailDto(team: TeamDetailRecord) {
    return {
      ...this.teamDto(team),
      roster: team.currentPlayers.map((player) => this.playerDto(player)),
    };
  }

  private playerWhere(query: DirectoryQuery): Prisma.PlayerWhereInput {
    return {
      status: 'ACTIVE',
      ...(query.q
        ? {
            OR: [
              { nickname: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
              { profile: { is: { realName: { contains: query.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(query.country ? { country: { is: { code: query.country } } } : {}),
      ...(query.team ? { currentTeam: { is: { slug: query.team } } } : {}),
    };
  }

  private teamWhere(query: DirectoryQuery): Prisma.TeamWhereInput {
    return {
      status: 'ACTIVE',
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { shortName: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.country ? { country: { is: { code: query.country } } } : {}),
    };
  }

  private page<T>(data: T[], total: number, query: DirectoryQuery) {
    return {
      data,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
        source: 'postgresql',
      },
    };
  }

  private handleWriteError(error: unknown, conflictMessage: string): never {
    if (error instanceof NotFoundException) throw error;
    if (errorCode(error) === 'P2002') throw new ConflictException(conflictMessage);
    if (errorCode(error) === 'P2025') throw new NotFoundException('Связанная запись не найдена');
    throw error;
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : undefined;
  }
}
