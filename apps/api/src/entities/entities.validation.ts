import { BadRequestException } from '@nestjs/common';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new BadRequestException(`Поле ${field} обязательно`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`Поле ${field}: допустимо от ${min} до ${max} символов`);
  }
  return normalized;
}

function slug(value: unknown): string {
  const normalized = text(value, 'slug', 2, 64).toLocaleLowerCase('en-US');
  if (!SLUG_PATTERN.test(normalized)) {
    throw new BadRequestException('Slug может содержать строчные латинские буквы, цифры и дефисы');
  }
  return normalized;
}

function countryCode(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z]{2}$/.test(value.trim())) {
    throw new BadRequestException('Код страны должен состоять из двух букв');
  }
  return value.trim().toUpperCase();
}

export type CreatePlayerInput = {
  slug: string;
  nickname: string;
  countryCode?: string;
  realName?: string;
};

export type UpdatePlayerInput = Partial<Omit<CreatePlayerInput, 'slug'>>;

export type CreateTeamInput = {
  slug: string;
  name: string;
  shortName: string;
  countryCode?: string;
};

export type UpdateTeamInput = Partial<Omit<CreateTeamInput, 'slug'>>;

export function parseCreatePlayer(value: unknown): CreatePlayerInput {
  const body = objectBody(value);
  const realName =
    body.realName === undefined ? undefined : text(body.realName, 'realName', 2, 120);
  return {
    slug: slug(body.slug),
    nickname: text(body.nickname, 'nickname', 2, 60),
    ...(countryCode(body.countryCode) ? { countryCode: countryCode(body.countryCode)! } : {}),
    ...(realName ? { realName } : {}),
  };
}

export function parseUpdatePlayer(value: unknown): UpdatePlayerInput {
  const body = objectBody(value);
  const result: UpdatePlayerInput = {};
  if (body.nickname !== undefined) result.nickname = text(body.nickname, 'nickname', 2, 60);
  if (body.countryCode !== undefined) {
    const code = countryCode(body.countryCode);
    if (code) result.countryCode = code;
  }
  if (body.realName !== undefined) result.realName = text(body.realName, 'realName', 2, 120);
  if (!Object.keys(result).length) throw new BadRequestException('Нет полей для обновления');
  return result;
}

export function parseCreateTeam(value: unknown): CreateTeamInput {
  const body = objectBody(value);
  const code = countryCode(body.countryCode);
  return {
    slug: slug(body.slug),
    name: text(body.name, 'name', 2, 120),
    shortName: text(body.shortName, 'shortName', 2, 16),
    ...(code ? { countryCode: code } : {}),
  };
}

export function parseUpdateTeam(value: unknown): UpdateTeamInput {
  const body = objectBody(value);
  const result: UpdateTeamInput = {};
  if (body.name !== undefined) result.name = text(body.name, 'name', 2, 120);
  if (body.shortName !== undefined) result.shortName = text(body.shortName, 'shortName', 2, 16);
  if (body.countryCode !== undefined) {
    const code = countryCode(body.countryCode);
    if (code) result.countryCode = code;
  }
  if (!Object.keys(result).length) throw new BadRequestException('Нет полей для обновления');
  return result;
}
