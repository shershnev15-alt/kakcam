import { describe, expect, it } from 'vitest';
import {
  cyberLevelForPpr,
  calculatePpr,
  calculatePprDetailed,
  calculateTprLeaderboard,
  recencyWeight,
  tierForScore,
  type RatingObservation,
} from './index';

const observation: RatingObservation = {
  performanceZ: 1.2,
  daysAgo: 10,
  opponentTpr: 700,
  tournamentCoefficient: 1.1,
  result: 'win',
  dataQuality: 1,
};

describe('PPR v1 foundation', () => {
  it('maps PPR to a stable 1-100 Cyber Level with calibration states', () => {
    expect(cyberLevelForPpr(842, 91)).toEqual({
      level: 84,
      status: 'OFFICIAL',
      visible: true,
      nextLevelAt: 850,
      pointsToNextLevel: 8,
      progress: 20,
    });
    expect(cyberLevelForPpr(634, 31)).toMatchObject({ level: 63, status: 'PROVISIONAL' });
    expect(cyberLevelForPpr(500, 24)).toMatchObject({ level: 50, visible: false });
    expect(cyberLevelForPpr(1000, 100)).toMatchObject({ level: 100, nextLevelAt: null });
  });
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

  it('explains score factors without changing deterministic output', () => {
    const detailed = calculatePprDetailed(Array.from({ length: 20 }, () => observation));
    expect(detailed.score).toBe(calculatePpr(Array.from({ length: 20 }, () => observation)).score);
    expect(detailed.factors.map((factor) => factor.key)).toEqual([
      'performance',
      'sample',
      'opponents',
      'trust',
    ]);
    expect(detailed.tier).toBe(tierForScore(detailed.score));
  });
});

describe('TPR v1', () => {
  const matches = [
    {
      id: 'm1',
      playedAt: '2026-08-20T12:00:00.000Z',
      homeTeamId: 'alpha',
      awayTeamId: 'bravo',
      homeScore: 2,
      awayScore: 0,
      tournamentCoefficient: 1,
      dataQuality: 1,
    },
    {
      id: 'm2',
      playedAt: '2026-08-25T12:00:00.000Z',
      homeTeamId: 'alpha',
      awayTeamId: 'charlie',
      homeScore: 2,
      awayScore: 1,
      tournamentCoefficient: 1.1,
      dataQuality: 0.9,
    },
  ];

  it('replays matches deterministically and rewards wins', () => {
    const first = calculateTprLeaderboard(
      ['alpha', 'bravo', 'charlie'],
      matches,
      '2026-09-02T00:00:00.000Z',
    );
    expect(first).toEqual(
      calculateTprLeaderboard(
        ['alpha', 'bravo', 'charlie'],
        [...matches].reverse(),
        '2026-09-02T00:00:00.000Z',
      ),
    );
    expect(first[0]).toMatchObject({ teamId: 'alpha', rank: 1, form: ['W', 'W'] });
    expect(first.every((team) => team.score >= 0 && team.score <= 1000)).toBe(true);
  });
});
