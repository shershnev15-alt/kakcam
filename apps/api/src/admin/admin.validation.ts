import { BadRequestException } from '@nestjs/common';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const adminResources = [
  'players',
  'teams',
  'matches',
  'tournaments',
  'organizations',
  'verification',
  'assertions',
  'imports',
  'reports',
  'users',
  'achievements',
  'ratings',
  'audit',
] as const;

export type AdminResource = (typeof adminResources)[number];

function body(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min = 1, max = 300): string {
  if (typeof value !== 'string') throw new BadRequestException(`Поле ${field} обязательно`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`Поле ${field}: допустимо от ${min} до ${max} символов`);
  }
  return normalized;
}

function optionalText(value: unknown, field: string, max = 300): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return text(value, field, 1, max);
}

function slug(value: unknown, field: string): string {
  const result = text(value, field, 2, 80).toLocaleLowerCase('en-US');
  if (!SLUG_PATTERN.test(result)) throw new BadRequestException(`Некорректный ${field}`);
  return result;
}

function date(value: unknown, field: string): Date {
  const result = new Date(text(value, field, 10, 40));
  if (Number.isNaN(result.getTime())) throw new BadRequestException(`Некорректная дата ${field}`);
  return result;
}

function integer(value: unknown, field: string, min: number, max: number): number {
  const result = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new BadRequestException(`Поле ${field} должно быть целым числом от ${min} до ${max}`);
  }
  return result;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new BadRequestException(`${field} должен быть boolean`);
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException(`Поле ${field} должно быть массивом строк`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export function parseAdminResource(value: string): AdminResource {
  if (!adminResources.includes(value as AdminResource)) {
    throw new BadRequestException('Неизвестный admin resource');
  }
  return value as AdminResource;
}

export function parseAdminListQuery(value: Record<string, string | undefined>) {
  return {
    page: value.page ? integer(value.page, 'page', 1, 10_000) : 1,
    pageSize: value.pageSize ? integer(value.pageSize, 'pageSize', 1, 50) : 20,
    q: optionalText(value.q, 'q', 80),
  };
}

export type TournamentInput = {
  slug: string;
  gameSlug: string;
  name: string;
  tier: string;
  mode: string;
  startsAt: Date;
  endsAt: Date;
  prizePool?: number;
  currency?: string;
};

export function parseTournament(value: unknown): TournamentInput {
  const data = body(value);
  const startsAt = date(data.startsAt, 'startsAt');
  const endsAt = date(data.endsAt, 'endsAt');
  if (endsAt <= startsAt) throw new BadRequestException('endsAt должна быть позже startsAt');
  const prizePool = data.prizePool === undefined ? undefined : Number(data.prizePool);
  if (prizePool !== undefined && (!Number.isFinite(prizePool) || prizePool < 0)) {
    throw new BadRequestException('Некорректный prizePool');
  }
  const currency = optionalText(data.currency, 'currency', 3)?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequestException('currency должен быть ISO-4217 кодом');
  }
  return {
    slug: slug(data.slug, 'slug'),
    gameSlug: slug(data.gameSlug, 'gameSlug'),
    name: text(data.name, 'name', 2, 160),
    tier: text(data.tier, 'tier', 2, 40),
    mode: text(data.mode, 'mode', 2, 40),
    startsAt,
    endsAt,
    ...(prizePool !== undefined ? { prizePool } : {}),
    ...(currency ? { currency } : {}),
  };
}

export type OrganizationInput = {
  slug: string;
  name: string;
  countryCode?: string;
  website?: string;
  isFederation?: boolean;
};

export function parseOrganization(value: unknown): OrganizationInput {
  const data = body(value);
  const countryCode = optionalText(data.countryCode, 'countryCode', 2)?.toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new BadRequestException('countryCode должен состоять из двух букв');
  }
  const website = optionalText(data.website, 'website', 300);
  const isFederation = optionalBoolean(data.isFederation, 'isFederation');
  if (website) {
    try {
      const parsed = new URL(website);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch {
      throw new BadRequestException('Некорректный website');
    }
  }
  return {
    slug: slug(data.slug, 'slug'),
    name: text(data.name, 'name', 2, 160),
    ...(countryCode ? { countryCode } : {}),
    ...(website ? { website } : {}),
    ...(isFederation !== undefined ? { isFederation } : {}),
  };
}

export function parseFederationReviewer(value: unknown) {
  const data = body(value);
  if (typeof data.enabled !== 'boolean') {
    throw new BadRequestException('enabled должен быть boolean');
  }
  const validUntil = data.validUntil ? date(data.validUntil, 'validUntil') : undefined;
  const userId = text(data.userId, 'userId', 36, 36);
  if (!UUID_PATTERN.test(userId)) throw new BadRequestException('Некорректный userId');
  if (validUntil && validUntil <= new Date()) {
    throw new BadRequestException('validUntil должен быть в будущем');
  }
  return {
    userId,
    enabled: data.enabled,
    ...(validUntil ? { validUntil } : {}),
    reason: text(data.reason, 'reason', 10, 500),
  };
}

export function parseAssertion(value: unknown) {
  const data = body(value);
  if (!UUID_PATTERN.test(text(data.entityId, 'entityId', 36, 36))) {
    throw new BadRequestException('Некорректный entityId');
  }
  return {
    entityType: text(data.entityType, 'entityType', 2, 60),
    entityId: String(data.entityId),
    fieldPath: text(data.fieldPath, 'fieldPath', 1, 160),
    value: data.value ?? null,
    sourceCode: optionalText(data.sourceCode, 'sourceCode', 64),
    observedAt: data.observedAt ? date(data.observedAt, 'observedAt') : new Date(),
    verificationLevel: integer(data.verificationLevel ?? 0, 'verificationLevel', 0, 5),
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseAssertionDecision(value: unknown) {
  const data = body(value);
  const status = text(data.status, 'status', 6, 20).toUpperCase();
  if (!['EFFECTIVE', 'REJECTED', 'SUPERSEDED'].includes(status)) {
    throw new BadRequestException('Некорректный assertion status');
  }
  return {
    status: status as 'EFFECTIVE' | 'REJECTED' | 'SUPERSEDED',
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseImport(value: unknown) {
  const data = body(value);
  return {
    sourceCode: text(data.sourceCode, 'sourceCode', 2, 64),
    externalKey: optionalText(data.externalKey, 'externalKey', 160),
    checksum: text(data.checksum, 'checksum', 16, 128),
    rawLocation: optionalText(data.rawLocation, 'rawLocation', 500),
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseResolution(value: unknown) {
  const data = body(value);
  return { resolution: text(data.resolution ?? data.reason, 'resolution', 4, 500) };
}

export function parseRoleAssignment(value: unknown) {
  const data = body(value);
  const roleCodes = stringArray(data.roleCodes, 'roleCodes');
  if (!roleCodes.length) throw new BadRequestException('Укажите хотя бы одну роль');
  return { roleCodes, reason: text(data.reason, 'reason', 4, 300) };
}

export function parseUserStatus(value: unknown) {
  const data = body(value);
  const status = text(data.status, 'status', 6, 16).toUpperCase();
  if (!['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
    throw new BadRequestException('Некорректный user status');
  }
  return {
    status: status as 'ACTIVE' | 'SUSPENDED' | 'DELETED',
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseAchievementUpdate(value: unknown) {
  const data = body(value);
  const rarity = optionalText(data.rarity, 'rarity', 16)?.toUpperCase();
  if (rarity && !['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].includes(rarity)) {
    throw new BadRequestException('Некорректная rarity');
  }
  const ruleVersion =
    data.ruleVersion === undefined
      ? undefined
      : integer(data.ruleVersion, 'ruleVersion', 1, 10_000);
  if (data.rule === undefined && !data.title && !data.description && !rarity && !ruleVersion) {
    throw new BadRequestException('Нет полей для обновления');
  }
  return {
    title: optionalText(data.title, 'title', 120),
    description: optionalText(data.description, 'description', 500),
    rarity: rarity as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' | undefined,
    rule: data.rule,
    ruleVersion,
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseArchive(value: unknown) {
  const data = body(value);
  return { reason: text(data.reason, 'reason', 4, 300) };
}

export function parseEntityType(value: string): 'player' | 'team' {
  if (value !== 'player' && value !== 'team') {
    throw new BadRequestException('Архивация поддерживает только player и team');
  }
  return value;
}
