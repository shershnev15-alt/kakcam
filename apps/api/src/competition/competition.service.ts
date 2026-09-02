import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import type {
  CompetitionQuery,
  CreateMatchInput,
  FinalizeMatchInput,
} from './competition.validation';

const teamSelect = { id: true, slug: true, name: true, shortName: true } as const;
const matchSummaryInclude = {
  tournament: { select: { slug: true, name: true } },
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
} satisfies Prisma.MatchInclude;
const matchDetailInclude = {
  ...matchSummaryInclude,
  maps: { orderBy: { mapOrder: 'asc' as const } },
  result: true,
  statistics: {
    where: { mapKey: 'all' },
    include: { player: { select: { id: true, slug: true, nickname: true } } },
    orderBy: [{ teamId: 'asc' as const }, { performanceRating: 'desc' as const }],
  },
} satisfies Prisma.MatchInclude;
const tournamentInclude = {
  _count: { select: { participants: true, matches: true } },
} satisfies Prisma.TournamentInclude;
const tournamentDetailInclude = {
  ...tournamentInclude,
  participants: {
    where: { status: 'ACTIVE' },
    include: { team: { select: teamSelect } },
    orderBy: { seed: 'asc' as const },
  },
  placements: {
    include: { team: { select: teamSelect } },
    orderBy: { placeFrom: 'asc' as const },
  },
  matches: { include: matchSummaryInclude, orderBy: { startsAt: 'desc' as const } },
} satisfies Prisma.TournamentInclude;

type MatchSummaryRecord = Prisma.MatchGetPayload<{ include: typeof matchSummaryInclude }>;
type MatchDetailRecord = Prisma.MatchGetPayload<{ include: typeof matchDetailInclude }>;
type TournamentRecord = Prisma.TournamentGetPayload<{ include: typeof tournamentInclude }>;
type TournamentDetailRecord = Prisma.TournamentGetPayload<{
  include: typeof tournamentDetailInclude;
}>;

@Injectable()
export class CompetitionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMatches(query: CompetitionQuery) {
    const where = this.matchWhere(query);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where,
        include: matchSummaryInclude,
        orderBy: { startsAt: query.status === 'UPCOMING' ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.match.count({ where }),
    ]);
    return this.page(
      records.map((record) => this.matchSummaryDto(record)),
      total,
      query,
    );
  }

  async matchById(id: string) {
    const record = await this.prisma.match.findUnique({
      where: { id },
      include: matchDetailInclude,
    });
    if (!record) throw new NotFoundException('Match not found');
    return this.matchDetailDto(record);
  }

  async listTournaments(query: CompetitionQuery) {
    const now = new Date();
    const where: Prisma.TournamentWhereInput = {
      ...(query.status === 'UPCOMING' ? { startsAt: { gt: now } } : {}),
      ...(query.status === 'LIVE' ? { startsAt: { lte: now }, endsAt: { gte: now } } : {}),
      ...(query.status === 'FINISHED' ? { endsAt: { lt: now } } : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.tournament.findMany({
        where,
        include: tournamentInclude,
        orderBy: { startsAt: query.status === 'FINISHED' ? 'desc' : 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.tournament.count({ where }),
    ]);
    return this.page(
      records.map((record) => this.tournamentDto(record, now)),
      total,
      query,
    );
  }

  async tournamentBySlug(slug: string) {
    const record = await this.prisma.tournament.findUnique({
      where: { slug },
      include: tournamentDetailInclude,
    });
    if (!record) throw new NotFoundException('Tournament not found');
    return this.tournamentDetailDto(record);
  }

  async createMatch(input: CreateMatchInput, actorId: string, request: HttpRequest) {
    const record = await this.prisma.$transaction(async (tx) => {
      const [homeTeam, awayTeam, game, tournament] = await Promise.all([
        tx.team.findFirst({ where: { slug: input.homeTeamSlug, status: 'ACTIVE' } }),
        tx.team.findFirst({ where: { slug: input.awayTeamSlug, status: 'ACTIVE' } }),
        tx.game.findUnique({ where: { slug: 'cs2' } }),
        input.tournamentSlug
          ? tx.tournament.findUnique({ where: { slug: input.tournamentSlug } })
          : Promise.resolve(null),
      ]);
      if (!homeTeam || !awayTeam) throw new NotFoundException('Team not found');
      if (!game) throw new NotFoundException('Game not found');
      if (input.tournamentSlug && !tournament) throw new NotFoundException('Tournament not found');
      const match = await tx.match.create({
        data: {
          gameId: game.id,
          tournamentId: tournament?.id ?? null,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startsAt: input.startsAt,
          stage: input.stage,
          bestOf: input.bestOf,
          status: 'SCHEDULED',
          verificationLevel: 1,
          sourceCode: 'manual',
          observedAt: new Date(),
        },
        include: matchDetailInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'match.create',
          targetType: 'Match',
          targetId: match.id,
          diff: { after: { ...input, startsAt: input.startsAt.toISOString() } },
          requestId: this.requestId(request),
        },
      });
      return match;
    });
    return this.matchDetailDto(record);
  }

  async finalizeMatch(
    id: string,
    input: FinalizeMatchInput,
    actorId: string,
    request: HttpRequest,
  ) {
    const record = await this.prisma.$transaction(async (tx) => {
      const before = await tx.match.findUnique({ where: { id }, include: matchDetailInclude });
      if (!before) throw new NotFoundException('Match not found');
      if (before.status === 'FINISHED' || before.result) {
        throw new ConflictException('Match is already finalized');
      }
      const winsRequired = Math.ceil(before.bestOf / 2);
      if (Math.max(input.homeScore, input.awayScore) !== winsRequired) {
        throw new BadRequestException(
          `Победитель серии BO${before.bestOf} должен набрать ${winsRequired}`,
        );
      }
      if (input.maps.length !== input.homeScore + input.awayScore) {
        throw new BadRequestException('Число карт не совпадает с итоговым счётом серии');
      }
      const finalizedAt = new Date();
      const winnerTeamId =
        input.homeScore > input.awayScore ? before.homeTeamId : before.awayTeamId;
      if (!winnerTeamId) throw new BadRequestException('У матча отсутствует одна из команд');
      const checksum = createHash('sha256')
        .update(JSON.stringify({ id, ...input, finalizedAt: finalizedAt.toISOString() }))
        .digest('hex');
      await tx.matchMap.deleteMany({ where: { matchId: id } });
      await tx.matchMap.createMany({
        data: input.maps.map((map, index) => ({
          matchId: id,
          mapOrder: index + 1,
          ...map,
          status: 'FINISHED',
        })),
      });
      await tx.matchResult.create({
        data: {
          matchId: id,
          winnerTeamId,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          checksum,
          sourceCode: input.sourceCode,
          finalizedAt,
        },
      });
      await tx.match.update({
        where: { id },
        data: {
          status: 'FINISHED',
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          verificationLevel: 3,
          sourceCode: input.sourceCode,
          finalizedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'match.finalize',
          targetType: 'Match',
          targetId: id,
          reason: input.reason,
          diff: {
            before: {
              status: before.status,
              homeScore: before.homeScore,
              awayScore: before.awayScore,
            },
            after: {
              status: 'FINISHED',
              homeScore: input.homeScore,
              awayScore: input.awayScore,
              checksum,
            },
          },
          requestId: this.requestId(request),
        },
      });
      return tx.match.findUniqueOrThrow({ where: { id }, include: matchDetailInclude });
    });
    return this.matchDetailDto(record);
  }

  private matchWhere(query: CompetitionQuery): Prisma.MatchWhereInput {
    const status =
      query.status === 'UPCOMING'
        ? 'SCHEDULED'
        : query.status === 'LIVE'
          ? 'LIVE'
          : query.status === 'FINISHED'
            ? 'FINISHED'
            : undefined;
    return {
      ...(status ? { status } : {}),
      ...(query.team
        ? {
            OR: [
              { homeTeam: { is: { slug: query.team } } },
              { awayTeam: { is: { slug: query.team } } },
            ],
          }
        : {}),
      ...(query.tournament ? { tournament: { is: { slug: query.tournament } } } : {}),
    };
  }

  private matchSummaryDto(match: MatchSummaryRecord) {
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

  private matchDetailDto(match: MatchDetailRecord) {
    return {
      ...this.matchSummaryDto(match),
      maps: match.maps.map((map) => ({
        mapKey: map.mapKey,
        mapOrder: map.mapOrder,
        homeScore: map.homeScore,
        awayScore: map.awayScore,
        overtime: map.overtime,
        status: map.status,
      })),
      playerStatistics: match.statistics.map((statistic) => ({
        playerId: statistic.playerId,
        nickname: statistic.player.nickname,
        slug: statistic.player.slug,
        teamId: statistic.teamId,
        kills: statistic.kills ?? 0,
        deaths: statistic.deaths ?? 0,
        assists: statistic.assists ?? 0,
        rating: Number(statistic.performanceRating ?? 0),
        adr: Number(statistic.adr ?? 0),
        kast: Number(statistic.kast ?? 0),
      })),
      sourceCode: match.sourceCode,
      observedAt: match.observedAt,
      finalizedAt: match.finalizedAt,
      checksum: match.result?.checksum ?? null,
    };
  }

  private tournamentDto(tournament: TournamentRecord, now = new Date()) {
    return {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      tier: tournament.tier,
      mode: tournament.mode,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      prizePool: Number(tournament.prizePool ?? 0),
      currency: tournament.currency ?? 'USD',
      status:
        tournament.startsAt > now ? 'UPCOMING' : tournament.endsAt < now ? 'FINISHED' : 'LIVE',
      participantCount: tournament._count.participants,
      matchCount: tournament._count.matches,
    };
  }

  private tournamentDetailDto(tournament: TournamentDetailRecord) {
    return {
      ...this.tournamentDto(tournament),
      participants: tournament.participants.map((item) => item.team),
      placements: tournament.placements.map((item) => ({
        placeFrom: item.placeFrom,
        placeTo: item.placeTo,
        prizeAmount: item.prizeAmount ? Number(item.prizeAmount) : null,
        team: item.team,
      })),
      matches: tournament.matches.map((match) => this.matchSummaryDto(match)),
    };
  }

  private page<T>(data: T[], total: number, query: CompetitionQuery) {
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

  private requestId(request: HttpRequest): string | null {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : null;
  }
}
