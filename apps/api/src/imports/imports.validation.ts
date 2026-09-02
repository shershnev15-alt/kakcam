import { BadRequestException } from '@nestjs/common';

function body(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Ожидается JSON object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new BadRequestException(`${field}: ожидается строка`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`${field}: длина должна быть ${min}–${max}`);
  }
  return normalized;
}

export function parseProviderImport(value: unknown) {
  const data = body(value);
  return {
    sourceCode: text(data.sourceCode, 'sourceCode', 2, 64),
    externalKey: text(data.externalKey, 'externalKey', 2, 160),
    reason: text(data.reason, 'reason', 4, 300),
  };
}

export function parseImportApply(value: unknown) {
  const data = body(value);
  return { reason: text(data.reason, 'reason', 4, 300) };
}
