import { BadRequestException } from '@nestjs/common';

export const analyticsEventNames = [
  'page_view',
  'search',
  'profile_share',
  'favorite',
  'reminder',
] as const;

const allowedSurfaces = new Set([
  'home',
  'players',
  'teams',
  'matches',
  'tournaments',
  'rankings',
  'search',
  'transfers',
  'account',
  'other',
]);

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsEventInput = { name: AnalyticsEventName; surface: string };

export function parseAnalyticsEvent(value: unknown): AnalyticsEventInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Ожидается JSON object');
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== 'name' && key !== 'surface')) {
    throw new BadRequestException('Дополнительные analytics properties запрещены');
  }
  if (
    typeof input.name !== 'string' ||
    !analyticsEventNames.includes(input.name as AnalyticsEventName)
  ) {
    throw new BadRequestException('Событие analytics не разрешено');
  }
  if (typeof input.surface !== 'string' || !allowedSurfaces.has(input.surface)) {
    throw new BadRequestException('Surface analytics не разрешён');
  }
  return { name: input.name as AnalyticsEventName, surface: input.surface };
}
