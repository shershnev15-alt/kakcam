import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { evaluateAchievementCatalog, type ThresholdRule } from '@arena/achievements-engine';
import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import { publicPlayerEligibilityWhere } from '../verification/publication.policy';
import type { CreateTransferInput, TransferQuery } from './career.validation';

const teamSelect = { id: true, slug: true, name: true, shortName: true } as const;

const metricByCode: Record<string, string> = {
  'career.first_match': 'matches',
  'career.first_tournament': 'tournaments',
  'career.tournaments_10': 'tournaments',
  'career.tournaments_50': 'tournaments',
  'victory.first': 'wins',
  'victory.10': 'wins',
  'victory.50': 'wins',
  'performance.30_bomb': 'max_kills',
  'performance.40_bomb': 'max_kills',
  'performance.perfect_map': 'perfect_maps',
  'clutch.1v2': 'clutch_1v2',
  'clutch.1v3': 'clutch_1v3',
  'clutch.1v4': 'clutch_1v4',
  'clutch.1v5': 'clutch_1v5',
  'team.loyal_365': 'loyal_days',
  'tournament.first_podium': 'podiums',
  'tournament.champion': 'championships',
  'rating.top_100': 'top_100',
  'rating.top_10': 'top_10',
  'special.mvp': 'mvp_awards',
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function jsonObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class CareerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async playerCareer(slug: string) {
    const player = await this.prisma.player.findFirst({
      where: { AND: [{ slug }, publicPlayerEligibilityWhere] },
      select: {
        id: true,
        slug: true,
        nickname: true,
        career: {
          include: { team: { select: teamSelect }, game: { select: { slug: true, name: true } } },
          orderBy: { startedAt: 'desc' },
        },
        transfers: {
          include: {
            fromTeam: { select: teamSelect },
            toTeam: { select: teamSelect },
          },
          orderBy: { transferDate: 'desc' },
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return {
      player: { id: player.id, slug: player.slug, nickname: player.nickname },
      periods: player.career.map((period) => ({
        id: period.id,
        team: period.team,
        game: period.game,
        role: period.role,
        startedAt: period.startedAt,
        endedAt: period.endedAt,
        verificationLevel: period.verificationLevel,
        evidence: period.evidence,
      })),
      transfers: player.transfers.map((transfer) => this.transferDto(transfer)),
    };
  }

  async playerAchievements(slug: string) {
    const player = await this.prisma.player.findFirst({
      where: { AND: [{ slug }, publicPlayerEligibilityWhere] },
      select: {
        id: true,
        slug: true,
        nickname: true,
        achievements: {
          include: { achievement: true },
          orderBy: [{ grantedAt: 'desc' }, { achievement: { code: 'asc' } }],
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return {
      player: { id: player.id, slug: player.slug, nickname: player.nickname },
      achievements: player.achievements.map((grant) => ({
        code: grant.achievement.code,
        title: grant.achievement.title,
        description: grant.achievement.description,
        category: grant.achievement.category,
        rarity: `${grant.achievement.rarity[0]}${grant.achievement.rarity
          .slice(1)
          .toLocaleLowerCase('en-US')}`,
        progress: Number(grant.progress),
        target: Number(grant.target),
        status: grant.status,
        grantedAt: grant.grantedAt,
        firstQualifiedAt: grant.firstQualifiedAt,
        verificationLevel: grant.verificationLevel,
        ruleVersion: grant.ruleVersion,
        evidence: grant.evidence,
      })),
    };
  }

  async listTransfers(query: TransferQuery) {
    const where: Prisma.TransferWhereInput = {
      status: { in: ['REPORTED', 'CONFIRMED'] },
      player: {
        is: {
          AND: [publicPlayerEligibilityWhere, ...(query.player ? [{ slug: query.player }] : [])],
        },
      },
      ...(query.team
        ? {
            OR: [{ fromTeam: { slug: query.team } }, { toTeam: { slug: query.team } }],
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.transfer.findMany({
        where,
        include: {
          player: { select: { id: true, slug: true, nickname: true } },
          fromTeam: { select: teamSelect },
          toTeam: { select: teamSelect },
        },
        orderBy: [{ transferDate: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.transfer.count({ where }),
    ]);
    return {
      data: records.map((record) => this.transferDto(record)),
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
        source: 'postgresql',
      },
    };
  }

  async createTransfer(input: CreateTransferInput, actorId: string, request: HttpRequest) {
    const [player, fromTeam, toTeam, game, source] = await Promise.all([
      this.prisma.player.findFirst({ where: { slug: input.playerSlug, status: 'ACTIVE' } }),
      input.fromTeamSlug
        ? this.prisma.team.findFirst({ where: { slug: input.fromTeamSlug, status: 'ACTIVE' } })
        : null,
      input.toTeamSlug
        ? this.prisma.team.findFirst({ where: { slug: input.toTeamSlug, status: 'ACTIVE' } })
        : null,
      this.prisma.game.findUnique({ where: { slug: 'cs2' } }),
      this.prisma.dataSource.findUnique({ where: { code: input.sourceCode } }),
    ]);
    if (!player) throw new NotFoundException('Player not found');
    if (input.fromTeamSlug && !fromTeam) throw new NotFoundException('Source team not found');
    if (input.toTeamSlug && !toTeam) throw new NotFoundException('Destination team not found');
    if (!game) throw new NotFoundException('Game not found');
    if (!source) throw new NotFoundException('Data source not found');

    const checksum = sha256(
      [
        player.id,
        fromTeam?.id ?? 'free-agent',
        toTeam?.id ?? 'free-agent',
        dateOnly(input.transferDate),
        input.status,
        input.evidenceReference,
      ].join(':'),
    );
    const existing = await this.prisma.transfer.findUnique({ where: { checksum } });
    if (existing) throw new ConflictException('Такой переход уже зарегистрирован');

    const record = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          playerId: player.id,
          fromTeamId: fromTeam?.id ?? null,
          toTeamId: toTeam?.id ?? null,
          transferDate: input.transferDate,
          status: input.status,
          sourceId: source.id,
          observedAt: new Date(),
          verificationLevel: input.status === 'CONFIRMED' ? source.trustLevel : 1,
          evidence: { reference: input.evidenceReference, sourceCode: source.code },
          checksum,
        },
        include: {
          player: { select: { id: true, slug: true, nickname: true } },
          fromTeam: { select: teamSelect },
          toTeam: { select: teamSelect },
        },
      });

      if (input.status === 'CONFIRMED') {
        await tx.careerHistory.updateMany({
          where: {
            playerId: player.id,
            endedAt: null,
            startedAt: { lte: input.transferDate },
          },
          data: { endedAt: input.transferDate },
        });
        if (toTeam) {
          await tx.careerHistory.upsert({
            where: {
              playerId_teamId_gameId_startedAt: {
                playerId: player.id,
                teamId: toTeam.id,
                gameId: game.id,
                startedAt: input.transferDate,
              },
            },
            update: {
              endedAt: null,
              role: input.role ?? null,
              sourceId: source.id,
              verificationLevel: source.trustLevel,
              evidence: { transferId: transfer.id, reference: input.evidenceReference },
            },
            create: {
              playerId: player.id,
              teamId: toTeam.id,
              gameId: game.id,
              role: input.role ?? null,
              startedAt: input.transferDate,
              sourceId: source.id,
              verificationLevel: source.trustLevel,
              evidence: { transferId: transfer.id, reference: input.evidenceReference },
            },
          });
        }
        await tx.player.update({
          where: { id: player.id },
          data: { currentTeamId: toTeam?.id ?? null },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'transfer.create',
          targetType: 'Transfer',
          targetId: transfer.id,
          reason: input.reason,
          diff: {
            after: {
              playerSlug: input.playerSlug,
              fromTeamSlug: input.fromTeamSlug ?? null,
              toTeamSlug: input.toTeamSlug ?? null,
              transferDate: dateOnly(input.transferDate),
              status: input.status,
              checksum,
            },
          },
          requestId: this.requestId(request) ?? null,
        },
      });
      return transfer;
    });
    return this.transferDto(record);
  }

  async replayAchievements(cutoff: Date, actorId: string, request: HttpRequest) {
    const [players, achievements, placements] = await Promise.all([
      this.prisma.player.findMany({
        where: { status: 'ACTIVE' },
        include: {
          statistics: {
            where: { mapKey: 'all', verifiedAt: { not: null, lte: cutoff } },
            include: { match: { include: { result: true } } },
            orderBy: [{ matchId: 'asc' }, { id: 'asc' }],
          },
          tournamentStatistics: {
            where: { tournament: { endsAt: { lte: cutoff } } },
            select: { tournamentId: true },
          },
          career: { orderBy: { startedAt: 'asc' } },
          ratings: {
            where: { publishedAt: { lte: cutoff }, run: { status: 'PUBLISHED' } },
            orderBy: { publishedAt: 'desc' },
            take: 1,
          },
          achievements: true,
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.achievement.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.tournamentPlacement.findMany({
        where: { verifiedAt: { not: null, lte: cutoff } },
        select: { tournamentId: true, teamId: true, placeFrom: true },
      }),
    ]);
    const rules: ThresholdRule[] = achievements.map((achievement) => {
      const rule = jsonObject(achievement.rule);
      return {
        code: achievement.code,
        metric: metricByCode[achievement.code] ?? achievement.code,
        target: typeof rule.target === 'number' ? rule.target : 1,
        minimumVerificationLevel: 3,
        ruleVersion: achievement.ruleVersion,
      };
    });

    let processed = 0;
    let reused = 0;
    let granted = 0;
    let provisional = 0;
    let revoked = 0;
    const replayChecksums: string[] = [];

    for (const player of players) {
      const teamIds = new Set(
        player.statistics
          .map((statistic) => statistic.teamId)
          .filter((teamId): teamId is string => Boolean(teamId)),
      );
      const tournamentIds = new Set(
        player.tournamentStatistics.map((statistic) => statistic.tournamentId),
      );
      const relevantPlacements = placements.filter(
        (placement) => teamIds.has(placement.teamId) && tournamentIds.has(placement.tournamentId),
      );
      const rank = player.ratings[0]?.rank ?? null;
      const loyalDays = player.career.reduce((maximum, period) => {
        const end = period.endedAt && period.endedAt < cutoff ? period.endedAt : cutoff;
        return Math.max(
          maximum,
          Math.max(0, Math.floor((end.getTime() - period.startedAt.getTime()) / 86_400_000)),
        );
      }, 0);
      const metrics = {
        matches: new Set(player.statistics.map((item) => item.matchId)).size,
        tournaments: tournamentIds.size,
        wins: player.statistics.filter((item) => item.match.result?.winnerTeamId === item.teamId)
          .length,
        max_kills: player.statistics.reduce(
          (maximum, item) => Math.max(maximum, item.kills ?? 0),
          0,
        ),
        perfect_maps: 0,
        clutch_1v2: 0,
        clutch_1v3: 0,
        clutch_1v4: 0,
        clutch_1v5: 0,
        loyal_days: loyalDays,
        podiums: relevantPlacements.filter((item) => item.placeFrom <= 3).length,
        championships: relevantPlacements.filter((item) => item.placeFrom === 1).length,
        top_100: rank !== null && rank <= 100 ? 1 : 0,
        top_10: rank !== null && rank <= 10 ? 1 : 0,
        mvp_awards: 0,
      };
      const checksum = sha256(JSON.stringify({ playerId: player.id, metrics, rules }));
      replayChecksums.push(checksum);
      const eventKey = `facts:${player.id}:${checksum}`;
      const existingEvent = await this.prisma.achievementEvent.findUnique({ where: { eventKey } });
      if (existingEvent) {
        reused += 1;
        continue;
      }
      const results = evaluateAchievementCatalog(rules, {
        eventKey,
        type: 'FactsReplayed',
        subjectId: player.id,
        occurredAt: cutoff.toISOString(),
        verificationLevel: 3,
        metrics,
        evidenceKeys: player.statistics.map((item) => item.matchId),
      });
      const existingByAchievement = new Map(
        player.achievements.map((grant) => [grant.achievementId, grant]),
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.achievementEvent.create({
          data: {
            eventKey,
            eventType: 'FactsReplayed',
            subjectType: 'Player',
            subjectId: player.id,
            occurredAt: cutoff,
            checksum,
            payload: { metrics, ruleCount: rules.length },
            processedAt: new Date(),
          },
        });
        for (const result of results) {
          const achievement = achievements.find((item) => item.code === result.code)!;
          const existingGrant = existingByAchievement.get(achievement.id);
          const status = result.granted
            ? 'GRANTED'
            : result.provisional
              ? 'PROVISIONAL'
              : existingGrant?.status === 'GRANTED'
                ? 'REVOKED'
                : 'LOCKED';
          if (status === 'GRANTED') granted += 1;
          if (status === 'PROVISIONAL') provisional += 1;
          if (status === 'REVOKED') revoked += 1;
          await tx.playerAchievement.upsert({
            where: {
              playerId_achievementId: {
                playerId: player.id,
                achievementId: achievement.id,
              },
            },
            update: {
              progress: result.progress,
              target: result.target,
              grantedAt: result.granted ? (existingGrant?.grantedAt ?? cutoff) : null,
              status,
              evidence: {
                eventKey,
                evidenceKeys: result.evidenceKeys,
                checksum,
              },
              evaluationKey: eventKey,
              verificationLevel: result.granted ? 3 : 0,
              firstQualifiedAt: result.firstQualifiedAt
                ? new Date(result.firstQualifiedAt)
                : (existingGrant?.firstQualifiedAt ?? null),
              ruleVersion: result.ruleVersion,
            },
            create: {
              playerId: player.id,
              achievementId: achievement.id,
              progress: result.progress,
              target: result.target,
              grantedAt: result.granted ? cutoff : null,
              status,
              evidence: {
                eventKey,
                evidenceKeys: result.evidenceKeys,
                checksum,
              },
              evaluationKey: eventKey,
              verificationLevel: result.granted ? 3 : 0,
              firstQualifiedAt: result.firstQualifiedAt ? new Date(result.firstQualifiedAt) : null,
              ruleVersion: result.ruleVersion,
            },
          });
        }
      });
      processed += 1;
    }

    const checksum = sha256(replayChecksums.sort().join(':'));
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'achievement.replay',
        targetType: 'AchievementEvent',
        reason: `Replay at ${cutoff.toISOString()}`,
        diff: { processed, reused, granted, provisional, revoked, checksum },
        requestId: this.requestId(request) ?? null,
      },
    });
    return {
      cutoff,
      checksum,
      players: players.length,
      processed,
      reused,
      granted,
      provisional,
      revoked,
    };
  }

  private transferDto(record: {
    id: string;
    transferDate: Date;
    status: string;
    verificationLevel: number;
    evidence: Prisma.JsonValue | null;
    checksum: string;
    player?: { id: string; slug: string; nickname: string };
    fromTeam: { id: string; slug: string; name: string; shortName: string } | null;
    toTeam: { id: string; slug: string; name: string; shortName: string } | null;
  }) {
    return {
      id: record.id,
      ...(record.player ? { player: record.player } : {}),
      fromTeam: record.fromTeam,
      toTeam: record.toTeam,
      transferDate: record.transferDate,
      status: record.status,
      verificationLevel: record.verificationLevel,
      evidence: record.evidence,
      checksum: record.checksum,
    };
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : value?.[0]?.slice(0, 128);
  }
}
