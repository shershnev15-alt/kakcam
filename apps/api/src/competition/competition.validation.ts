import { BadRequestException } from '@nestjs/common';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min = 2, max = 120): string {
  if (typeof value !== 'string') throw new BadRequestException(`Поле ${field} обязательно`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`Поле ${field}: допустимо от ${min} до ${max} символов`);
  }
  return normalized;
}

function slug(value: unknown, field: string): string {
  const normalized = text(value, field, 2, 80).toLocaleLowerCase('en-US');
  if (!SLUG.test(normalized)) throw new BadRequestException(`Некорректный ${field}`);
  return normalized;
}

function integer(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`Поле ${field} должно быть целым числом от ${min} до ${max}`);
  }
  return parsed;
}

export type CompetitionQuery = {
  page: number;
  pageSize: number;
  status?: 'LIVE' | 'UPCOMING' | 'FINISHED';
  team?: string;
  tournament?: string;
};

export function parseCompetitionQuery(value: Record<string, string | undefined>): CompetitionQuery {
  const status = value.status?.toUpperCase();
  if (status && !['LIVE', 'UPCOMING', 'FINISHED'].includes(status)) {
    throw new BadRequestException('Некорректный статус');
  }
  const normalizedStatus = status as CompetitionQuery['status'];
  const team = value.team ? slug(value.team, 'team') : undefined;
  const tournament = value.tournament ? slug(value.tournament, 'tournament') : undefined;
  return {
    page: value.page ? integer(value.page, 'page', 1, 10_000) : 1,
    pageSize: value.pageSize ? integer(value.pageSize, 'pageSize', 1, 50) : 20,
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
    ...(team ? { team } : {}),
    ...(tournament ? { tournament } : {}),
  };
}

export type CreateMatchInput = {
  homeTeamSlug: string;
  awayTeamSlug: string;
  tournamentSlug?: string;
  startsAt: Date;
  stage: string;
  bestOf: 1 | 3 | 5;
};

export function parseCreateMatch(value: unknown): CreateMatchInput {
  const body = object(value);
  const homeTeamSlug = slug(body.homeTeamSlug, 'homeTeamSlug');
  const awayTeamSlug = slug(body.awayTeamSlug, 'awayTeamSlug');
  if (homeTeamSlug === awayTeamSlug) throw new BadRequestException('Команды должны различаться');
  const startsAt = new Date(text(body.startsAt, 'startsAt', 10, 40));
  if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Некорректная дата матча');
  const bestOf = integer(body.bestOf ?? 1, 'bestOf', 1, 5);
  if (![1, 3, 5].includes(bestOf)) throw new BadRequestException('bestOf должен быть 1, 3 или 5');
  return {
    homeTeamSlug,
    awayTeamSlug,
    ...(body.tournamentSlug ? { tournamentSlug: slug(body.tournamentSlug, 'tournamentSlug') } : {}),
    startsAt,
    stage: text(body.stage ?? 'Матч', 'stage', 2, 80),
    bestOf: bestOf as 1 | 3 | 5,
  };
}

export type FinalizeMatchInput = {
  homeScore: number;
  awayScore: number;
  sourceCode: string;
  reason: string;
  maps: Array<{
    mapKey: string;
    homeScore: number;
    awayScore: number;
    overtime: boolean;
  }>;
};

export function parseFinalizeMatch(value: unknown): FinalizeMatchInput {
  const body = object(value);
  const homeScore = integer(body.homeScore, 'homeScore', 0, 3);
  const awayScore = integer(body.awayScore, 'awayScore', 0, 3);
  if (homeScore === awayScore) throw new BadRequestException('Итог серии не может быть ничьей');
  if (!Array.isArray(body.maps) || !body.maps.length || body.maps.length > 5) {
    throw new BadRequestException('Укажите от одной до пяти карт');
  }
  const maps = body.maps.map((item, index) => {
    const map = object(item);
    const mapHomeScore = integer(map.homeScore, `maps[${index}].homeScore`, 0, 99);
    const mapAwayScore = integer(map.awayScore, `maps[${index}].awayScore`, 0, 99);
    if (mapHomeScore === mapAwayScore)
      throw new BadRequestException('Карта не может завершиться вничью');
    return {
      mapKey: slug(map.mapKey, `maps[${index}].mapKey`),
      homeScore: mapHomeScore,
      awayScore: mapAwayScore,
      overtime: map.overtime === true,
    };
  });
  return {
    homeScore,
    awayScore,
    sourceCode: text(body.sourceCode, 'sourceCode', 2, 64),
    reason: text(body.reason, 'reason', 4, 300),
    maps,
  };
}
