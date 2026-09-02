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
  profile: { select: { realName: true, birthDate: true, regionName: true } },
  aggregateStatistics: {
    orderBy: { periodEnd: 'desc' as const },
    take: 1,
    select: { sampleMatches: true, wins: true },
  },
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

const publicMatchInclude = {
  tournament: { select: { slug: true, name: true } },
  homeTeam: { select: { id: true, slug: true, name: true, shortName: true } },
  awayTeam: { select: { id: true, slug: true, name: true, shortName: true } },
} satisfies Prisma.MatchInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;
type TeamRecord = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;
type TeamDetailRecord = Prisma.TeamGetPayload<{ include: typeof teamDetailInclude }>;
type PublicMatchRecord = Prisma.MatchGetPayload<{ include: typeof publicMatchInclude }>;
type PlayerStatisticRecord = Prisma.PlayerStatisticGetPayload<Record<string, never>>;
type TeamStatisticRecord = Prisma.TeamStatisticGetPayload<Record<string, never>>;

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
    if (query.sort === 'matches' || query.sort === 'winRate') {
      const records = await this.prisma.player.findMany({ where, include: playerInclude });
      records.sort((left, right) => {
        const leftStats = left.aggregateStatistics[0];
        const rightStats = right.aggregateStatistics[0];
        const leftValue =
          query.sort === 'matches'
            ? (leftStats?.sampleMatches ?? 0)
            : (leftStats?.wins ?? 0) / Math.max(1, leftStats?.sampleMatches ?? 0);
        const rightValue =
          query.sort === 'matches'
            ? (rightStats?.sampleMatches ?? 0)
            : (rightStats?.wins ?? 0) / Math.max(1, rightStats?.sampleMatches ?? 0);
        return rightValue - leftValue || left.nickname.localeCompare(right.nickname, 'ru');
      });
      const offset = (query.page - 1) * query.pageSize;
      return this.page(
        records.slice(offset, offset + query.pageSize).map((record) => this.playerDto(record)),
        records.length,
        query,
      );
    }
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
        run,
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
    const [similar, performance, matchStatistics, achievements, ratingHistory] = await Promise.all([
      this.prisma.player.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: record.id },
          ...(record.currentTeamId ? { currentTeamId: record.currentTeamId } : {}),
        },
        include: playerInclude,
        orderBy: { aggregateVerificationLevel: 'desc' },
        take: 4,
      }),
      this.prisma.playerStatistic.findFirst({
        where: { playerId: record.id },
        orderBy: { periodEnd: 'desc' },
      }),
      this.prisma.playerMatchStatistic.findMany({
        where: { playerId: record.id, verifiedAt: { not: null }, mapKey: 'all' },
        include: {
          match: { include: publicMatchInclude },
        },
        orderBy: { match: { startsAt: 'desc' } },
        take: 6,
      }),
      this.prisma.playerAchievement.findMany({
        where: { playerId: record.id, status: 'GRANTED' },
        include: { achievement: true },
        orderBy: { grantedAt: 'desc' },
      }),
      this.prisma.playerRating.findMany({
        where: { playerId: record.id, run: { status: 'PUBLISHED' } },
        include: { run: { select: { formulaVersion: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      }),
    ]);
    return {
      ...this.playerDto(record),
      similar: similar.map((item) => this.playerDto(item)),
      performance: performance ? this.playerPerformanceDto(performance) : null,
      matches: matchStatistics.map((item) => this.matchSummaryDto(item.match)),
      achievements: achievements.map((item) => ({
        code: item.achievement.code,
        title: item.achievement.title,
        description: item.achievement.description,
        category: item.achievement.category,
        rarity: this.rarity(item.achievement.rarity),
        progress: Number(item.progress),
        target: Number(item.target),
        grantedAt: item.grantedAt,
      })),
      ratingHistory: ratingHistory.map((item) => this.ratingHistoryDto(item)),
      ratingFactors: this.ratingFactors(record.ratings[0]?.explanation),
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
        run,
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
    const [performance, matches, placements, achievements, ratingHistory] = await Promise.all([
      this.prisma.teamStatistic.findFirst({
        where: { teamId: record.id },
        orderBy: { periodEnd: 'desc' },
      }),
      this.prisma.match.findMany({
        where: { OR: [{ homeTeamId: record.id }, { awayTeamId: record.id }] },
        include: publicMatchInclude,
        orderBy: { startsAt: 'desc' },
        take: 6,
      }),
      this.prisma.tournamentPlacement.findMany({
        where: { teamId: record.id },
        include: { tournament: true },
        orderBy: { tournament: { endsAt: 'desc' } },
        take: 6,
      }),
      this.prisma.teamAchievement.findMany({
        where: { teamId: record.id, status: 'GRANTED' },
        include: { achievement: true },
        orderBy: { grantedAt: 'desc' },
      }),
      this.prisma.teamRating.findMany({
        where: { teamId: record.id, run: { status: 'PUBLISHED' } },
        include: { run: { select: { formulaVersion: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      }),
    ]);
    return {
      ...this.teamDetailDto(record),
      performance: performance ? this.teamPerformanceDto(performance) : null,
      matches: matches.map((match) => this.matchSummaryDto(match)),
      tournaments: placements.map((item) => ({
        id: item.tournament.id,
        slug: item.tournament.slug,
        name: item.tournament.name,
        mode: item.tournament.mode,
        endsAt: item.tournament.endsAt,
        placeFrom: item.placeFrom,
        placeTo: item.placeTo,
        prizeAmount: Number(item.prizeAmount ?? 0),
      })),
      achievements: achievements.map((item) => ({
        code: item.achievement.code,
        title: item.achievement.title,
        description: item.achievement.description,
        category: item.achievement.category,
        rarity: this.rarity(item.achievement.rarity),
        progress: Number(item.progress),
        target: Number(item.target),
        grantedAt: item.grantedAt,
      })),
      ratingHistory: ratingHistory.map((item) => this.ratingHistoryDto(item)),
      ratingFactors: this.ratingFactors(record.ratings[0]?.explanation),
    };
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
      city: player.profile?.regionName ?? null,
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
      matchCount: player.aggregateStatistics[0]?.sampleMatches ?? 0,
      winRate: Number(
        (
          (player.aggregateStatistics[0]?.wins ?? 0) /
          Math.max(1, player.aggregateStatistics[0]?.sampleMatches ?? 0)
        ).toFixed(3),
      ),
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
      city: team.city,
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

  private matchSummaryDto(match: PublicMatchRecord) {
    return {
      id: match.id,
      startsAt: match.startsAt,
      status: match.status === 'SCHEDULED' ? 'UPCOMING' : match.status,
      tournament: match.tournament?.name ?? 'Вне турнира',
      tournamentSlug: match.tournament?.slug ?? null,
      stage: match.stage ?? 'Матч',
      bestOf: match.bestOf,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      verificationLevel: match.verificationLevel,
    };
  }

  private playerPerformanceDto(record: PlayerStatisticRecord) {
    const metrics = jsonObject(record.metrics);
    return {
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      sampleMatches: record.sampleMatches,
      sampleMaps: record.sampleMaps,
      rounds: record.rounds,
      kills: record.kills,
      deaths: record.deaths,
      assists: record.assists,
      wins: record.wins,
      losses: record.losses,
      kd: typeof metrics.kd === 'number' ? metrics.kd : 0,
      adr: typeof metrics.adr === 'number' ? metrics.adr : 0,
      kast: typeof metrics.kast === 'number' ? metrics.kast : 0,
      winRate: Number((record.wins / Math.max(1, record.sampleMatches)).toFixed(3)),
      performanceRating:
        typeof metrics.performanceRating === 'number' ? metrics.performanceRating : 0,
    };
  }

  private teamPerformanceDto(record: TeamStatisticRecord) {
    return {
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      sampleMatches: record.sampleMatches,
      wins: record.wins,
      losses: record.losses,
      mapsWon: record.mapsWon,
      mapsLost: record.mapsLost,
      roundsWon: record.roundsWon,
      roundsLost: record.roundsLost,
      winRate: Number((record.wins / Math.max(1, record.sampleMatches)).toFixed(3)),
      roundDifference: record.roundsWon - record.roundsLost,
    };
  }

  private rarity(value: string): 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' {
    const normalized = value.toLocaleLowerCase('en-US');
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` as
      | 'Common'
      | 'Rare'
      | 'Epic'
      | 'Legendary'
      | 'Mythic';
  }

  private ratingHistoryDto(record: {
    score: number;
    confidence: Prisma.Decimal;
    rank: number | null;
    publishedAt: Date;
    explanation: Prisma.JsonValue;
    run: { formulaVersion: string };
  }) {
    return {
      score: record.score,
      confidence: Math.round(Number(record.confidence)),
      rank: record.rank ?? 0,
      publishedAt: record.publishedAt,
      formulaVersion: record.run.formulaVersion,
      factors: this.ratingFactors(record.explanation),
    };
  }

  private ratingFactors(value: Prisma.JsonValue | null | undefined) {
    const factors = jsonObject(value).factors;
    if (!Array.isArray(factors)) return [];
    return factors.flatMap((factor) => {
      if (!factor || typeof factor !== 'object' || Array.isArray(factor)) return [];
      const item = factor as Record<string, Prisma.JsonValue>;
      if (
        typeof item.key !== 'string' ||
        typeof item.label !== 'string' ||
        typeof item.contribution !== 'number'
      ) {
        return [];
      }
      return [{ key: item.key, label: item.label, contribution: item.contribution }];
    });
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
      ...(query.city
        ? { profile: { is: { regionName: { contains: query.city, mode: 'insensitive' } } } }
        : {}),
      ...(query.team ? { currentTeam: { is: { slug: query.team } } } : {}),
      ...(query.role
        ? {
            ratings: {
              some: { explanation: { path: ['roles'], array_contains: query.role } },
            },
          }
        : {}),
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
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    };
  }

  private page<T>(
    data: T[],
    total: number,
    query: DirectoryQuery,
    ratingRun?: {
      id: string;
      formulaVersion: string;
      inputCutoff: Date;
      checksum: string;
    },
  ) {
    return {
      data,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
        source: 'postgresql',
        ...(ratingRun
          ? {
              ratingRun: {
                id: ratingRun.id,
                formulaVersion: ratingRun.formulaVersion,
                inputCutoff: ratingRun.inputCutoff,
                checksum: ratingRun.checksum,
              },
            }
          : {}),
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
