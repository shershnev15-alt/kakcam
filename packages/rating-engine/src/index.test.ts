import { describe, expect, it } from 'vitest';
import { calculatePpr, recencyWeight, type RatingObservation } from './index';

const observation: RatingObservation = {
  performanceZ: 1.2,
  daysAgo: 10,
  opponentTpr: 700,
  tournamentCoefficient: 1.1,
  result: 'win',
  dataQuality: 1,
};

describe('PPR v1 foundation', () => {
  it('implements documented decay boundaries', () => {
    expect([30, 31, 90, 91, 180, 181, 365, 366].map(recencyWeight)).toEqual([
      1, 0.85, 0.85, 0.65, 0.65, 0.4, 0.4, 0,
    ]);
  });

  it('shrinks a tiny sample toward the cohort prior', () => {
    const result = calculatePpr([observation]);
    expect(result.score).toBeGreaterThan(500);
    expect(result.score).toBeLessThan(600);
    expect(result.confidence).toBeLessThan(10);
  });

  it('is deterministic and bounded', () => {
    const input = Array.from({ length: 40 }, () => observation);
    expect(calculatePpr(input)).toEqual(calculatePpr(input));
    expect(calculatePpr(input).score).toBeLessThanOrEqual(1000);
  });

  it('returns neutral provisional value without current observations', () => {
    expect(calculatePpr([])).toEqual({ score: 500, confidence: 0, effectiveSample: 0 });
  });
});
