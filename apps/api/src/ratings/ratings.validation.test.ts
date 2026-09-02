import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseRecalculateRatings } from './ratings.validation';

describe('rating run validation', () => {
  it('parses an explicit UTC cutoff', () => {
    expect(
      parseRecalculateRatings({ cutoff: '2026-09-01T12:00:00.000Z' }).cutoff.toISOString(),
    ).toBe('2026-09-01T12:00:00.000Z');
  });

  it('rejects invalid cutoff values', () => {
    expect(() => parseRecalculateRatings({ cutoff: 'not-a-date' })).toThrow(BadRequestException);
  });
});
