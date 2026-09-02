import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseCreatePlayer, parseCreateTeam, parseUpdatePlayer } from './entities.validation';

describe('entity request validation', () => {
  it('normalizes player slug and country', () => {
    expect(
      parseCreatePlayer({
        slug: 'Frost-Byte',
        nickname: ' FrostByte ',
        countryCode: 'ru',
      }),
    ).toEqual({ slug: 'frost-byte', nickname: 'FrostByte', countryCode: 'RU' });
  });

  it('rejects unsafe slugs', () => {
    expect(() => parseCreateTeam({ slug: '../team', name: 'Team', shortName: 'TM' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects an empty patch', () => {
    expect(() => parseUpdatePlayer({})).toThrow(BadRequestException);
  });
});
