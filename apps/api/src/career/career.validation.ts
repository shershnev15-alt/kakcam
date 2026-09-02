import { BadRequestException } from '@nestjs/common';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min = 2, max = 300): string {
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

export type TransferQuery = { page: number; pageSize: number; player?: string; team?: string };

export function parseTransferQuery(value: Record<string, string | undefined>): TransferQuery {
  const integer = (raw: string | undefined, fallback: number, max: number) => {
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
      throw new BadRequestException('Некорректная пагинация');
    }
    return parsed;
  };
  return {
    page: integer(value.page, 1, 10_000),
    pageSize: integer(value.pageSize, 20, 50),
    ...(value.player ? { player: slug(value.player, 'player') } : {}),
    ...(value.team ? { team: slug(value.team, 'team') } : {}),
  };
}

export type CreateTransferInput = {
  playerSlug: string;
  fromTeamSlug?: string;
  toTeamSlug?: string;
  transferDate: Date;
  status: 'REPORTED' | 'CONFIRMED';
  role?: string;
  sourceCode: string;
  reason: string;
  evidenceReference: string;
};

export function parseCreateTransfer(value: unknown): CreateTransferInput {
  const body = object(value);
  const fromTeamSlug = body.fromTeamSlug ? slug(body.fromTeamSlug, 'fromTeamSlug') : undefined;
  const toTeamSlug = body.toTeamSlug ? slug(body.toTeamSlug, 'toTeamSlug') : undefined;
  if (!fromTeamSlug && !toTeamSlug) {
    throw new BadRequestException('Нужно указать исходную или новую команду');
  }
  if (fromTeamSlug && fromTeamSlug === toTeamSlug) {
    throw new BadRequestException('Команды перехода должны различаться');
  }
  const transferDate = new Date(text(body.transferDate, 'transferDate', 10, 40));
  if (Number.isNaN(transferDate.getTime())) throw new BadRequestException('Некорректная дата');
  const status = text(body.status ?? 'CONFIRMED', 'status', 8, 12).toUpperCase();
  if (status !== 'REPORTED' && status !== 'CONFIRMED') {
    throw new BadRequestException('Допустимы статусы REPORTED и CONFIRMED');
  }
  return {
    playerSlug: slug(body.playerSlug, 'playerSlug'),
    ...(fromTeamSlug ? { fromTeamSlug } : {}),
    ...(toTeamSlug ? { toTeamSlug } : {}),
    transferDate,
    status,
    ...(body.role ? { role: text(body.role, 'role', 2, 60) } : {}),
    sourceCode: text(body.sourceCode, 'sourceCode', 2, 64),
    reason: text(body.reason, 'reason', 4, 300),
    evidenceReference: text(body.evidenceReference, 'evidenceReference', 4, 500),
  };
}

export function parseAchievementReplay(value: unknown): { cutoff: Date } {
  const body = object(value);
  const cutoff = body.cutoff ? new Date(text(body.cutoff, 'cutoff', 10, 40)) : new Date();
  if (Number.isNaN(cutoff.getTime())) throw new BadRequestException('Некорректный cutoff');
  return { cutoff };
}
