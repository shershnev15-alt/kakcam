import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import { Cs2AlphaAdapter } from './cs2-alpha.adapter';
import { Cs2BravoAdapter } from './cs2-bravo.adapter';
import type { CanonicalCs2Match, CanonicalEntityRef, Cs2ProviderAdapter } from './provider.types';
import { ProviderPayloadError } from './provider.types';
import {
  aggregateCs2PlayerStatistics,
  payloadChecksum,
  validateCanonicalCs2Match,
} from './provider.validation';

type ProviderImportInput = { sourceCode: string; externalKey: string; reason: string };
type ResolutionMethod = 'LINK' | 'SLUG' | 'UNRESOLVED';
type EntityType = 'Team' | 'Player' | 'Tournament';
type EntityResolution = {
  entityType: EntityType;
  externalId: string;
  entityId: string | null;
  method: ResolutionMethod;
  confidence: number;
};
type ResolvedMatch = {
  match: CanonicalCs2Match;
  gameId: string | null;
  homeTeam: EntityResolution;
  awayTeam: EntityResolution;
  tournament: EntityResolution | null;
  players: EntityResolution[];
  existingMatchId: string | null;
  action: 'CREATE' | 'ASSERT' | 'SKIP';
  issues: string[];
};

@Injectable()
export class ImportsService {
  private readonly adapters: Map<string, Cs2ProviderAdapter>;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    const adapters = [new Cs2AlphaAdapter(), new Cs2BravoAdapter()];
    this.adapters = new Map(adapters.map((adapter) => [adapter.descriptor.sourceCode, adapter]));
  }

  providers() {
    return {
      data: [...this.adapters.values()].map((adapter) => adapter.descriptor),
      meta: { gameSlug: 'cs2', enabledGames: ['cs2'] },
    };
  }

  async getImport(id: string) {
    const record = await this.prisma.dataImport.findUnique({
      where: { id },
      include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
    });
    if (!record) throw new NotFoundException('Импорт не найден');
    return record;
  }

  async stage(input: ProviderImportInput, actorId: string, request: HttpRequest) {
    const adapter = this.adapters.get(input.sourceCode);
    if (!adapter) throw new BadRequestException('Для источника нет активного CS2 adapter');
    const source = await this.prisma.dataSource.findUnique({ where: { code: input.sourceCode } });
    if (!source || !source.isActive) throw new BadRequestException('Активный источник не найден');

    const payload = await adapter.fetch(input.externalKey);
    const checksum = payloadChecksum(payload);
    const existing = await this.prisma.dataImport.findUnique({
      where: { sourceId_checksum: { sourceId: source.id, checksum } },
      include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return { ...existing, reused: true };

    let records;
    try {
      records = adapter.normalize(payload);
    } catch (error) {
      const issues = error instanceof ProviderPayloadError ? error.issues : ['Mapping failed'];
      const failed = await this.prisma.dataImport.create({
        data: {
          sourceId: source.id,
          externalKey: input.externalKey,
          checksum,
          status: 'FAILED',
          rawLocation: `mock://${source.code}/${encodeURIComponent(input.externalKey)}`,
          counters: { fetched: 1, mapped: 0, valid: 0 },
          errors: issues,
          completedAt: new Date(),
        },
        include: { source: true, records: true },
      });
      await this.audit(actorId, request, 'import.stage.failed', failed.id, input.reason, {
        issues,
      });
      return { ...failed, reused: false };
    }
    if (!records.length) throw new BadRequestException('Provider не вернул записей');

    const staged = await Promise.all(
      records.map(async (record) => {
        const structuralIssues = validateCanonicalCs2Match(record.canonicalPayload);
        const resolved = await this.resolveMatch(source.id, record.canonicalPayload);
        return {
          ...record,
          checksum: payloadChecksum(record.rawPayload),
          status: structuralIssues.length ? ('INVALID' as const) : ('VALID' as const),
          errors: [...structuralIssues, ...resolved.issues],
          stagedPayload: { match: record.canonicalPayload, resolution: resolved },
        };
      }),
    );
    const invalid = staged.filter((record) => record.status === 'INVALID').length;
    const unresolved = staged.filter(
      (record) => record.errors.length && record.status === 'VALID',
    ).length;
    const counters = {
      fetched: 1,
      mapped: staged.length,
      valid: staged.length - invalid,
      invalid,
      unresolved,
      create: staged.filter((record) => record.stagedPayload.resolution.action === 'CREATE').length,
      assert: staged.filter((record) => record.stagedPayload.resolution.action === 'ASSERT').length,
      skip: staged.filter((record) => record.stagedPayload.resolution.action === 'SKIP').length,
    };

    try {
      const imported = await this.prisma.$transaction(async (tx) => {
        const created = await tx.dataImport.create({
          data: {
            sourceId: source.id,
            externalKey: input.externalKey,
            checksum,
            status: invalid ? 'FAILED' : 'REVIEW',
            rawLocation: `mock://${source.code}/${encodeURIComponent(input.externalKey)}`,
            counters,
            errors: staged.flatMap((record) => record.errors),
            ...(invalid ? { completedAt: new Date() } : {}),
            records: {
              create: staged.map((record) => ({
                externalKey: record.externalKey,
                entityType: record.entityType,
                checksum: record.checksum,
                status: record.status,
                rawPayload: this.json(record.rawPayload),
                canonicalPayload: this.json(record.stagedPayload),
                errors: this.json(record.errors),
              })),
            },
          },
          include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'import.stage',
            targetType: 'DataImport',
            targetId: created.id,
            reason: input.reason,
            diff: this.json({ sourceCode: source.code, externalKey: input.externalKey, counters }),
            requestId: this.requestId(request) ?? null,
          },
        });
        return created;
      });
      return { ...imported, reused: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.dataImport.findUnique({
          where: { sourceId_checksum: { sourceId: source.id, checksum } },
          include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
        });
        if (replay) return { ...replay, reused: true };
      }
      throw error;
    }
  }

  async apply(id: string, reason: string, actorId: string, request: HttpRequest) {
    const imported = await this.prisma.dataImport.findUnique({
      where: { id },
      include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
    });
    if (!imported) throw new NotFoundException('Импорт не найден');
    if (imported.status === 'COMPLETED') return { ...imported, reused: true };
    if (imported.status !== 'REVIEW') {
      throw new ConflictException('Применить можно только импорт в статусе REVIEW');
    }
    if (!this.adapters.has(imported.source.code)) {
      throw new BadRequestException('CS2 adapter источника отключён');
    }

    const resolvedRecords: Array<{ recordId: string; resolution: ResolvedMatch }> = [];
    for (const record of imported.records) {
      if (record.status !== 'VALID' || !record.canonicalPayload) {
        throw new ConflictException(`Record ${record.externalKey} не прошёл validation`);
      }
      const staged = record.canonicalPayload as unknown as { match: CanonicalCs2Match };
      const structuralIssues = validateCanonicalCs2Match(staged.match);
      const resolution = await this.resolveMatch(imported.sourceId, staged.match);
      const issues = [...structuralIssues, ...resolution.issues];
      if (issues.length) {
        throw new ConflictException(`Record ${record.externalKey}: ${issues.join('; ')}`);
      }
      resolvedRecords.push({ recordId: record.id, resolution });
    }

    try {
      const applied = await this.prisma.$transaction(
        async (tx) => {
          const claimed = await tx.dataImport.updateMany({
            where: { id, status: 'REVIEW' },
            data: { status: 'APPLYING' },
          });
          if (claimed.count !== 1) {
            throw new ConflictException('Импорт уже применяет другой процесс');
          }
          const outcomes: Array<{ action: ResolvedMatch['action']; entityId: string }> = [];
          for (const item of resolvedRecords) {
            outcomes.push(
              await this.applyMatch(tx, imported.source, item.recordId, item.resolution),
            );
          }
          const counters = {
            records: outcomes.length,
            created: outcomes.filter((item) => item.action === 'CREATE').length,
            asserted: outcomes.filter((item) => item.action === 'ASSERT').length,
            skipped: outcomes.filter((item) => item.action === 'SKIP').length,
          };
          const completed = await tx.dataImport.update({
            where: { id },
            data: {
              status: 'COMPLETED',
              counters,
              errors: Prisma.JsonNull,
              completedAt: new Date(),
            },
            include: { source: true, records: { orderBy: { createdAt: 'asc' } } },
          });
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'import.apply',
              targetType: 'DataImport',
              targetId: id,
              reason,
              diff: this.json({ sourceCode: imported.source.code, counters, outcomes }),
              requestId: this.requestId(request) ?? null,
            },
          });
          return completed;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { ...applied, reused: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Данные изменились параллельно — повторите apply');
      }
      throw error;
    }
  }

  private async resolveMatch(sourceId: string, match: CanonicalCs2Match): Promise<ResolvedMatch> {
    const game = await this.prisma.game.findUnique({
      where: { slug: 'cs2' },
      select: { id: true },
    });
    const [homeTeam, awayTeam, tournament] = await Promise.all([
      this.resolveEntity(sourceId, 'Team', match.homeTeam),
      this.resolveEntity(sourceId, 'Team', match.awayTeam),
      match.tournament
        ? this.resolveEntity(sourceId, 'Tournament', match.tournament)
        : Promise.resolve(null),
    ]);
    const uniquePlayers = [
      ...new Map(
        match.playerStatistics.map((stat) => [stat.player.externalId, stat.player]),
      ).values(),
    ];
    const players = await Promise.all(
      uniquePlayers.map((player) => this.resolveEntity(sourceId, 'Player', player)),
    );
    const matchLink = await this.prisma.externalEntityLink.findUnique({
      where: {
        sourceId_entityType_externalId: {
          sourceId,
          entityType: 'Match',
          externalId: match.externalId,
        },
      },
    });
    const exactMatch =
      !matchLink && game && homeTeam.entityId && awayTeam.entityId
        ? await this.prisma.match.findFirst({
            where: {
              gameId: game.id,
              homeTeamId: homeTeam.entityId,
              awayTeamId: awayTeam.entityId,
              startsAt: new Date(match.startsAt),
            },
            select: { id: true },
          })
        : null;
    const issues = [
      ...(game ? [] : ['Игра cs2 не найдена']),
      ...(homeTeam.entityId ? [] : [`Не найдена команда ${homeTeam.externalId}`]),
      ...(awayTeam.entityId ? [] : [`Не найдена команда ${awayTeam.externalId}`]),
      ...(match.tournament && !tournament?.entityId
        ? [`Не найден турнир ${match.tournament.externalId}`]
        : []),
      ...players
        .filter((player) => !player.entityId)
        .map((player) => `Не найден игрок ${player.externalId}`),
    ];
    return {
      match,
      gameId: game?.id ?? null,
      homeTeam,
      awayTeam,
      tournament,
      players,
      existingMatchId: matchLink?.entityId ?? exactMatch?.id ?? null,
      action: matchLink ? 'SKIP' : exactMatch ? 'ASSERT' : 'CREATE',
      issues,
    };
  }

  private async resolveEntity(
    sourceId: string,
    entityType: EntityType,
    reference: CanonicalEntityRef,
  ): Promise<EntityResolution> {
    const linked = await this.prisma.externalEntityLink.findUnique({
      where: {
        sourceId_entityType_externalId: {
          sourceId,
          entityType,
          externalId: reference.externalId,
        },
      },
    });
    if (linked) {
      return {
        entityType,
        externalId: reference.externalId,
        entityId: linked.entityId,
        method: 'LINK',
        confidence: linked.confidence,
      };
    }
    const candidate =
      entityType === 'Team'
        ? await this.prisma.team.findUnique({
            where: { slug: reference.slugHint },
            select: { id: true },
          })
        : entityType === 'Player'
          ? await this.prisma.player.findUnique({
              where: { slug: reference.slugHint },
              select: { id: true },
            })
          : await this.prisma.tournament.findUnique({
              where: { slug: reference.slugHint },
              select: { id: true },
            });
    return {
      entityType,
      externalId: reference.externalId,
      entityId: candidate?.id ?? null,
      method: candidate ? 'SLUG' : 'UNRESOLVED',
      confidence: candidate ? 90 : 0,
    };
  }

  private async applyMatch(
    tx: Prisma.TransactionClient,
    source: { id: string; code: string; trustLevel: number },
    recordId: string,
    resolved: ResolvedMatch,
  ): Promise<{ action: ResolvedMatch['action']; entityId: string }> {
    const match = resolved.match;
    if (!resolved.gameId || !resolved.homeTeam.entityId || !resolved.awayTeam.entityId) {
      throw new ConflictException('Identity resolution устарел');
    }
    let action = resolved.action;
    let entityId = resolved.existingMatchId;
    if (action === 'CREATE') {
      const concurrentMatch = await tx.match.findFirst({
        where: {
          gameId: resolved.gameId,
          homeTeamId: resolved.homeTeam.entityId,
          awayTeamId: resolved.awayTeam.entityId,
          startsAt: new Date(match.startsAt),
        },
        select: { id: true },
      });
      if (concurrentMatch) {
        action = 'ASSERT';
        entityId = concurrentMatch.id;
      }
    }
    if (action === 'ASSERT') {
      await tx.fieldAssertion.create({
        data: {
          entityType: 'Match',
          entityId: entityId!,
          fieldPath: 'provider.cs2Match.v1',
          value: this.json(match),
          sourceId: source.id,
          observedAt: new Date(match.observedAt),
          verificationLevel: Math.min(5, source.trustLevel),
          status: 'CANDIDATE',
        },
      });
    } else if (action === 'CREATE') {
      const created = await tx.match.create({
        data: {
          gameId: resolved.gameId,
          tournamentId: resolved.tournament?.entityId ?? null,
          homeTeamId: resolved.homeTeam.entityId,
          awayTeamId: resolved.awayTeam.entityId,
          startsAt: new Date(match.startsAt),
          status: match.status,
          stage: match.stage,
          bestOf: match.bestOf,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          verificationLevel: Math.min(5, source.trustLevel),
          sourceCode: source.code,
          observedAt: new Date(match.observedAt),
          finalizedAt: match.status === 'FINISHED' ? new Date(match.observedAt) : null,
        },
      });
      entityId = created.id;
      if (match.maps.length) {
        await tx.matchMap.createMany({
          data: match.maps.map((map) => ({
            matchId: created.id,
            mapKey: map.mapKey,
            mapOrder: map.mapOrder,
            homeScore: map.homeScore,
            awayScore: map.awayScore,
            overtime: map.overtime,
            status: map.status,
          })),
        });
      }
      const playerIds = new Map(
        resolved.players.map((player) => [player.externalId, player.entityId]),
      );
      if (match.playerStatistics.length) {
        const statistics = [
          ...match.playerStatistics,
          ...aggregateCs2PlayerStatistics(match.playerStatistics),
        ];
        await tx.playerMatchStatistic.createMany({
          data: statistics.map((stat) => {
            const playerId = playerIds.get(stat.player.externalId);
            if (!playerId) throw new ConflictException(`Не найден игрок ${stat.player.externalId}`);
            const home = stat.teamExternalId === match.homeTeam.externalId;
            return {
              playerId,
              matchId: created.id,
              mapKey: stat.mapKey,
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              rounds: stat.rounds,
              teamId: home ? resolved.homeTeam.entityId : resolved.awayTeam.entityId,
              opponentTeamId: home ? resolved.awayTeam.entityId : resolved.homeTeam.entityId,
              performanceRating: stat.rating,
              adr: stat.adr,
              kast: stat.kast,
              headshotRate: stat.headshotRate,
              verifiedAt: new Date(match.observedAt),
              sourceCode: source.code,
              metrics: this.json({
                providerRecordId: recordId,
                schema: 'cs2.v1',
                grain: stat.mapKey === 'all' ? 'series' : 'map',
              }),
              schemaVersion: 1,
            };
          }),
        });
      }
      if (match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
        await tx.matchResult.create({
          data: {
            matchId: created.id,
            winnerTeamId:
              match.homeScore > match.awayScore
                ? resolved.homeTeam.entityId
                : resolved.awayTeam.entityId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            checksum: payloadChecksum(match),
            sourceCode: source.code,
            finalizedAt: new Date(match.observedAt),
          },
        });
      }
    }
    if (!entityId) throw new ConflictException('Match identity не разрешён');

    const links = [resolved.homeTeam, resolved.awayTeam, ...resolved.players];
    if (resolved.tournament) links.push(resolved.tournament);
    for (const link of links) {
      if (!link.entityId) continue;
      await tx.externalEntityLink.upsert({
        where: {
          sourceId_entityType_externalId: {
            sourceId: source.id,
            entityType: link.entityType,
            externalId: link.externalId,
          },
        },
        update: { confidence: link.confidence },
        create: {
          sourceId: source.id,
          entityType: link.entityType,
          externalId: link.externalId,
          entityId: link.entityId,
          confidence: link.confidence,
        },
      });
    }
    await tx.externalEntityLink.upsert({
      where: {
        sourceId_entityType_externalId: {
          sourceId: source.id,
          entityType: 'Match',
          externalId: match.externalId,
        },
      },
      update: { entityId, confidence: 100, confirmedAt: new Date() },
      create: {
        sourceId: source.id,
        entityType: 'Match',
        externalId: match.externalId,
        entityId,
        confidence: 100,
        confirmedAt: new Date(),
      },
    });
    await tx.dataImportRecord.update({
      where: { id: recordId },
      data: {
        status: action === 'SKIP' ? 'SKIPPED' : 'APPLIED',
        appliedEntityId: entityId,
        appliedAt: new Date(),
        errors: Prisma.JsonNull,
        canonicalPayload: this.json({ match, resolution: resolved }),
      },
    });
    return { action, entityId };
  }

  private async audit(
    actorId: string,
    request: HttpRequest,
    action: string,
    targetId: string,
    reason: string,
    diff: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType: 'DataImport',
        targetId,
        reason,
        diff: this.json(diff),
        requestId: this.requestId(request) ?? null,
      },
    });
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : value?.[0]?.slice(0, 128);
  }
}
