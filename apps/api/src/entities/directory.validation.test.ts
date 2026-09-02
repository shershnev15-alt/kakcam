import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseDirectoryQuery, parseSearchQuery } from './directory.validation';

describe('directory query validation', () => {
  it('normalizes filters and pagination', () => {
    expect(
      parseDirectoryQuery(
        { q: ' frost ', country: 'ru', team: 'Northern-Lights', page: '2', pageSize: '10' },
        { allowTeam: true },
      ),
    ).toEqual({
      q: 'frost',
      country: 'RU',
      team: 'northern-lights',
      page: 2,
      pageSize: 10,
      sort: 'rating',
    });
  });

  it('rejects excessive page sizes', () => {
    expect(() => parseDirectoryQuery({ pageSize: '100' })).toThrow(BadRequestException);
  });

  it('requires at least two search characters', () => {
    expect(() => parseSearchQuery('a')).toThrow(BadRequestException);
  });
});
