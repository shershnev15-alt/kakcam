import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseDirectoryQuery, parseSearchQuery } from './directory.validation';

describe('directory query validation', () => {
  it('normalizes filters and pagination', () => {
    expect(
      parseDirectoryQuery(
        {
          q: ' frost ',
          country: 'ru',
          city: ' Москва ',
          role: ' AWP ',
          discipline: 'CS2',
          team: 'Northern-Lights',
          page: '2',
          pageSize: '10',
        },
        { allowTeam: true },
      ),
    ).toEqual({
      q: 'frost',
      country: 'RU',
      city: 'Москва',
      role: 'AWP',
      discipline: 'cs2',
      team: 'northern-lights',
      page: 2,
      pageSize: 10,
      sort: 'rating',
    });
  });

  it('rejects excessive page sizes', () => {
    expect(() => parseDirectoryQuery({ pageSize: '100' })).toThrow(BadRequestException);
  });

  it('rejects disciplines that are not enabled in MVP', () => {
    expect(() => parseDirectoryQuery({ discipline: 'dota-2' })).toThrow(BadRequestException);
  });

  it('requires at least two search characters', () => {
    expect(() => parseSearchQuery('a')).toThrow(BadRequestException);
  });
});
