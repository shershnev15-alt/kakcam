import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  calculatePprDetailed,
  calculateTprLeaderboard,
  type RatingObservation,
  type TprMatchObservation,
} from '@arena/rating-engine';
import { createHash } from 'node:crypto';
import type { Prisma, RatingEngine } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';

const PPR_VERSION = 'ppr-v1.0.0';
const TPR_VERSION = 'tpr-v1.0.0';

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function tournamentCoefficient(tier: string | null | undefined): number {
  const normalized = tier?.toLocaleLowerCase('en-US');
  if (normalized === 'international' || normalized === 'elite') return 1.1;
  if (normalized === 'national') return 1;
  if (normalized === 'regional') return 0.95;
  return 0.85;
}

@Injectable()
export class RatingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recalculate(cutoff: Date, actorId: string, request: HttpRequest) {
    const game = await this.prisma.game.findUnique({ where: { slug: 'cs2' } });
    if (!game) throw new NotFoundException('Game not found');
    const [ppr, tpr] = await Promise.all([
      this.calculatePlayers(game.id, cutoff),
      this.calculateTeams(game.id, cutoff),
    ]);
    const result = await this.prisma.$transaction(async (tx) => {
      const pprRun = await this.persistPlayerRun(tx, game.id, cutoff, ppr);
      const tprRun = await this.persistTeamRun(tx, game.id, cutoff, tpr);
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'rating.recalculate',
          targetType: 'RatingRun',
          targetId: pprRun.id,
          reason: 'Reproducible PPR/TPR publication',
          diff: {
            cutoff: cutoff.toISOString(),
            pprRunId: pprRun.id,
            tprRunId: tprRun.id,
            playerCount: ppr.length,
            teamCount: tpr.length,
          },
          requestId: this.requestId(request),
        },
      });
      return { pprRun, tprRun };
    });
    return {
      cutoff,
      playerCount: ppr.length,
      teamCount: tpr.length,
      pprRun: this.runDto(result.pprRun),
      tprRun: this.runDto(result.tprRun),
    };
  }

  async runs(engine?: string) {
    const normalized = engine?.toUpperCase();
    const where: Prisma.RatingRunWhereInput =
      normalized === 'PPR' || normalized === 'TPR' ? { engine: normalized } : {};
    const records = await this.prisma.ratingRun.findMany({
      where: { ...where, status: 'PUBLISHED' },
      orderBy: { inputCutoff: 'desc' },
      take: 20,
    });
    return { data: records.map((run) => this.runDto(run)), meta: { source: 'postgresql' } };
  }

  async playerHistory(slug: string) {
    const player = await this.prisma.player.findFirst({ where: { slug, status: 'ACTIVE' } });
    if (!player) throw new NotFoundException('Player not found');
    const records = await this.prisma.playerRating.findMany({
      where: { playerId: player.id, run: { status: 'PUBLISHED' } },
      include: { run: true },
      orderBy: { publishedAt: 'desc' },
      take: 24,
    });
    return {
      data: records.map((record) => this.historyDto(record, record.run.formulaVersion)),
      meta: { source: 'postgresql', total: records.length },
    };
  }

  async teamHistory(slug: string) {
    const team = await this.prisma.team.findFirst({ where: { slug, status: 'ACTIVE' } });
    if (!team) throw new NotFoundException('Team not found');
    const records = await this.prisma.teamRating.findMany({
      where: { teamId: team.id, run: { status: 'PUBLISHED' } },
      include: { run: true },
      orderBy: { publishedAt: 'desc' },
      take: 24,
    });
    return {
      data: records.map((record) => this.historyDto(record, record.run.formulaVersion)),
      meta: { source: 'postgresql', total: records.length },
    };
  }

  private async calculatePlayers(gameId: string, cutoff: Date) {
    const [players, teamRatings] = await Promise.all([
      this.prisma.player.findMany({
        where: { status: 'ACTIVE' },
        include: {
          ratings: {
            where: { run: { status: 'PUBLISHED' } },
            orderBy: { publishedAt: 'desc' },
            take: 1,
          },
          statistics: {
            where: {
              mapKey: 'all',
              verifiedAt: { not: null, lte: cutoff },
              match: { status: 'FINISHED', startsAt: { lte: cutoff } },
            },
            include: { match: { include: { result: true, tournament: true } } },
            orderBy: { match: { startsAt: 'asc' } },
          },
        },
      }),
      this.latestTeamScores(cutoff),
    ]);
    return players
      .map((player) => {
        const observations: RatingObservation[] = player.statistics.map((statistic) => ({
          performanceZ: (Number(statistic.performanceRating ?? 1) - 1) / 0.25,
          daysAgo: Math.max(
            0,
            (cutoff.getTime() - statistic.match.startsAt.getTime()) / 86_400_000,
          ),
          opponentTpr: statistic.opponentTeamId
            ? (teamRatings.get(statistic.opponentTeamId) ?? 500)
            : 500,
          tournamentCoefficient: tournamentCoefficient(statistic.match.tournament?.tier),
          result: statistic.match.result?.winnerTeamId === statistic.teamId ? 'win' : 'loss',
          dataQuality: Math.max(0.65, statistic.match.verificationLevel / 3),
        }));
        const result = calculatePprDetailed(observations);
        const form = player.statistics
          .slice(-12)
          .map((statistic) =>
            Math.round(
              Math.min(
                1000,
                Math.max(0, 500 + (Number(statistic.performanceRating ?? 1) - 1) * 300),
              ),
            ),
          );
        const previousExplanation = jsonObject(player.ratings[0]?.explanation);
        const roles = Array.isArray(previousExplanation.roles)
          ? previousExplanation.roles.filter((role): role is string => typeof role === 'string')
          : ['Player'];
        return { playerId: player.id, result, form, roles };
      })
      .sort(
        (left, right) =>
          right.result.score - left.result.score || left.playerId.localeCompare(right.playerId),
      )
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  private async calculateTeams(_gameId: string, cutoff: Date) {
    const [teams, matches] = await Promise.all([
      this.prisma.team.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }),
      this.prisma.match.findMany({
        where: {
          status: 'FINISHED',
          verificationLevel: { gte: 3 },
          startsAt: { lte: cutoff },
          homeTeamId: { not: null },
          awayTeamId: { not: null },
          homeScore: { not: null },
          awayScore: { not: null },
        },
        include: { tournament: true },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const observations: TprMatchObservation[] = matches.map((match) => ({
      id: match.id,
      playedAt: match.startsAt.toISOString(),
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homeScore: match.homeScore!,
      awayScore: match.awayScore!,
      tournamentCoefficient: tournamentCoefficient(match.tournament?.tier),
      dataQuality: Math.max(0.65, match.verificationLevel / 3),
    }));
    return calculateTprLeaderboard(
      teams.map((team) => team.id),
      observations,
      cutoff.toISOString(),
    );
  }

  private async latestTeamScores(cutoff: Date) {
    const ratings = await this.prisma.teamRating.findMany({
      where: { publishedAt: { lte: cutoff }, run: { status: 'PUBLISHED' } },
      orderBy: { publishedAt: 'desc' },
    });
    const scores = new Map<string, number>();
    for (const rating of ratings)
      if (!scores.has(rating.teamId)) scores.set(rating.teamId, rating.score);
    return scores;
  }

  private async persistPlayerRun(
    tx: Prisma.TransactionClient,
    gameId: string,
    cutoff: Date,
    ratings: Awaited<ReturnType<RatingsService['calculatePlayers']>>,
  ) {
    const checksum = this.checksum({ formulaVersion: PPR_VERSION, cutoff, ratings });
    const run = await tx.ratingRun.upsert({
      where: {
        engine_formulaVersion_inputCutoff: {
          engine: 'PPR',
          formulaVersion: PPR_VERSION,
          inputCutoff: cutoff,
        },
      },
      update: { checksum, status: 'PUBLISHED', config: { periodDays: 365, cohort: 'cs2-cis' } },
      create: {
        engine: 'PPR',
        formulaVersion: PPR_VERSION,
        inputCutoff: cutoff,
        checksum,
        status: 'PUBLISHED',
        config: { periodDays: 365, cohort: 'cs2-cis' },
      },
    });
    for (const item of ratings) {
      const previous = await tx.playerRating.findFirst({
        where: {
          playerId: item.playerId,
          publishedAt: { lt: cutoff },
          run: { status: 'PUBLISHED' },
        },
        orderBy: { publishedAt: 'desc' },
      });
      const explanation: Prisma.InputJsonObject = {
        delta7d: previous ? item.result.score - previous.score : 0,
        delta30d: previous ? item.result.score - previous.score : 0,
        tier: item.result.tier,
        effectiveSample: item.result.effectiveSample,
        factors: item.result.factors.map((factor) => ({ ...factor })),
        strongestFactor: item.result.strongestFactor,
        weakestFactor: item.result.weakestFactor,
        form: item.form,
        roles: item.roles,
      };
      await tx.playerRating.upsert({
        where: { playerId_gameId_runId: { playerId: item.playerId, gameId, runId: run.id } },
        update: {
          score: item.result.score,
          confidence: item.result.confidence,
          rank: item.rank,
          explanation,
          publishedAt: cutoff,
        },
        create: {
          playerId: item.playerId,
          gameId,
          runId: run.id,
          score: item.result.score,
          confidence: item.result.confidence,
          rank: item.rank,
          explanation,
          publishedAt: cutoff,
        },
      });
    }
    return run;
  }

  private async persistTeamRun(
    tx: Prisma.TransactionClient,
    gameId: string,
    cutoff: Date,
    ratings: Awaited<ReturnType<RatingsService['calculateTeams']>>,
  ) {
    const checksum = this.checksum({ formulaVersion: TPR_VERSION, cutoff, ratings });
    const run = await tx.ratingRun.upsert({
      where: {
        engine_formulaVersion_inputCutoff: {
          engine: 'TPR',
          formulaVersion: TPR_VERSION,
          inputCutoff: cutoff,
        },
      },
      update: { checksum, status: 'PUBLISHED', config: { periodDays: 365, cohort: 'cs2-cis' } },
      create: {
        engine: 'TPR',
        formulaVersion: TPR_VERSION,
        inputCutoff: cutoff,
        checksum,
        status: 'PUBLISHED',
        config: { periodDays: 365, cohort: 'cs2-cis' },
      },
    });
    for (const item of ratings) {
      const previous = await tx.teamRating.findFirst({
        where: {
          teamId: item.teamId,
          publishedAt: { lt: cutoff },
          run: { status: 'PUBLISHED' },
        },
        orderBy: { publishedAt: 'desc' },
      });
      const explanation: Prisma.InputJsonObject = {
        delta7d: previous ? item.score - previous.score : 0,
        delta30d: previous ? item.score - previous.score : 0,
        tier: item.tier,
        effectiveMatches: item.effectiveMatches,
        opponentCount: item.opponentCount,
        factors: item.factors.map((factor) => ({ ...factor })),
        form: item.form,
      };
      await tx.teamRating.upsert({
        where: { teamId_gameId_runId: { teamId: item.teamId, gameId, runId: run.id } },
        update: {
          score: item.score,
          confidence: item.confidence,
          rank: item.rank,
          explanation,
          publishedAt: cutoff,
        },
        create: {
          teamId: item.teamId,
          gameId,
          runId: run.id,
          score: item.score,
          confidence: item.confidence,
          rank: item.rank,
          explanation,
          publishedAt: cutoff,
        },
      });
    }
    return run;
  }

  private historyDto(
    rating: {
      score: number;
      confidence: Prisma.Decimal;
      rank: number | null;
      publishedAt: Date;
      explanation: Prisma.JsonValue;
    },
    formulaVersion: string,
  ) {
    const explanation = jsonObject(rating.explanation);
    return {
      score: rating.score,
      confidence: Math.round(Number(rating.confidence)),
      rank: rating.rank ?? 0,
      publishedAt: rating.publishedAt,
      formulaVersion,
      factors: Array.isArray(explanation.factors) ? explanation.factors : [],
    };
  }

  private runDto(run: {
    id: string;
    engine: RatingEngine;
    formulaVersion: string;
    inputCutoff: Date;
    checksum: string;
    status: string;
    config: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: run.id,
      engine: run.engine,
      formulaVersion: run.formulaVersion,
      inputCutoff: run.inputCutoff,
      checksum: run.checksum,
      status: run.status,
      config: run.config,
      createdAt: run.createdAt,
    };
  }

  private checksum(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private requestId(request: HttpRequest): string | null {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : null;
  }
}
