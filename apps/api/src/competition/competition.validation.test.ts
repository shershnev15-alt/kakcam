import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  parseCompetitionQuery,
  parseCreateMatch,
  parseFinalizeMatch,
} from './competition.validation';

describe('competition validation', () => {
  it('normalizes match filters', () => {
    expect(
      parseCompetitionQuery({ status: 'live', team: 'Northern-Lights', pageSize: '6' }),
    ).toEqual({ status: 'LIVE', team: 'northern-lights', page: 1, pageSize: 6 });
  });

  it('rejects a match against the same team', () => {
    expect(() =>
      parseCreateMatch({
        homeTeamSlug: 'volna',
        awayTeamSlug: 'volna',
        startsAt: '2026-09-12T10:00:00Z',
        stage: 'Final',
        bestOf: 3,
      }),
    ).toThrow(BadRequestException);
  });

  it('validates a confirmed result and maps', () => {
    expect(
      parseFinalizeMatch({
        homeScore: 2,
        awayScore: 0,
        sourceCode: 'organizer-feed',
        reason: 'Official result',
        maps: [
          { mapKey: 'ancient', homeScore: 13, awayScore: 8 },
          { mapKey: 'mirage', homeScore: 13, awayScore: 10 },
        ],
      }),
    ).toMatchObject({
      homeScore: 2,
      awayScore: 0,
      maps: [{ mapKey: 'ancient' }, { mapKey: 'mirage' }],
    });
  });
});
