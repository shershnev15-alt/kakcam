import { BadRequestException } from '@nestjs/common';

export type RecalculateRatingsInput = { cutoff: Date };

export function parseRecalculateRatings(value: unknown): RecalculateRatingsInput {
  if (value === undefined || value === null) return { cutoff: new Date() };
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  const cutoffValue = (value as Record<string, unknown>).cutoff;
  if (cutoffValue === undefined) return { cutoff: new Date() };
  if (typeof cutoffValue !== 'string') throw new BadRequestException('Некорректный cutoff');
  const cutoff = new Date(cutoffValue);
  if (Number.isNaN(cutoff.getTime())) throw new BadRequestException('Некорректный cutoff');
  if (cutoff.getTime() > Date.now() + 60_000) {
    throw new BadRequestException('Cutoff не может находиться в будущем');
  }
  return { cutoff };
}
