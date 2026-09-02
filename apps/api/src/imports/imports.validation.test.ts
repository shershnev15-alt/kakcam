import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseImportApply, parseProviderImport } from './imports.validation';

describe('provider import validation', () => {
  it('accepts a CS2 provider fixture request', () => {
    expect(
      parseProviderImport({
        sourceCode: 'cs2-demo-alpha',
        externalKey: 'alpha-upcoming-001',
        reason: 'Плановая проверка источника',
      }),
    ).toEqual({
      sourceCode: 'cs2-demo-alpha',
      externalKey: 'alpha-upcoming-001',
      reason: 'Плановая проверка источника',
    });
  });

  it('requires an explicit apply reason', () => {
    expect(() => parseImportApply({ reason: '' })).toThrow(BadRequestException);
  });
});
