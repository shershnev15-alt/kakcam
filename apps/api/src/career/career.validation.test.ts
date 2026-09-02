import { describe, expect, it } from 'vitest';
import {
  parseAchievementReplay,
  parseCreateTransfer,
  parseTransferQuery,
} from './career.validation';

describe('career validation', () => {
  it('normalizes a confirmed transfer', () => {
    expect(
      parseCreateTransfer({
        playerSlug: 'FrostByte',
        fromTeamSlug: 'northern-lights',
        toTeamSlug: 'volna',
        transferDate: '2026-09-02',
        status: 'confirmed',
        sourceCode: 'arena-demo',
        reason: 'Official roster update',
        evidenceReference: 'official:roster:42',
      }),
    ).toMatchObject({ playerSlug: 'frostbyte', status: 'CONFIRMED', toTeamSlug: 'volna' });
  });

  it('rejects a transfer without either team', () => {
    expect(() =>
      parseCreateTransfer({
        playerSlug: 'frostbyte',
        transferDate: '2026-09-02',
        sourceCode: 'arena-demo',
        reason: 'Roster update',
        evidenceReference: 'official:roster:42',
      }),
    ).toThrow('исходную или новую команду');
  });

  it('validates paging and replay cutoff', () => {
    expect(parseTransferQuery({ page: '2', pageSize: '10', team: 'volna' })).toMatchObject({
      page: 2,
      pageSize: 10,
      team: 'volna',
    });
    expect(parseAchievementReplay({ cutoff: '2026-09-02T10:00:00.000Z' }).cutoff).toBeInstanceOf(
      Date,
    );
  });
});
