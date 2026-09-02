import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  parseAdminResource,
  parseAssertionDecision,
  parseOrganization,
  parseRoleAssignment,
  parseTournament,
  parseUserStatus,
} from './admin.validation';

describe('admin validation', () => {
  it('accepts only allow-listed resource names', () => {
    expect(parseAdminResource('audit')).toBe('audit');
    expect(() => parseAdminResource('sessions')).toThrow(BadRequestException);
  });

  it('validates tournament chronology and currency', () => {
    const tournament = parseTournament({
      slug: 'autumn-cup',
      gameSlug: 'cs2',
      name: 'Autumn Cup',
      tier: 'Regional',
      mode: 'LAN',
      startsAt: '2026-09-10T10:00:00.000Z',
      endsAt: '2026-09-12T20:00:00.000Z',
      prizePool: 1000,
      currency: 'usd',
    });
    expect(tournament.currency).toBe('USD');
    expect(() =>
      parseTournament({ ...tournament, startsAt: tournament.endsAt, endsAt: tournament.startsAt }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsafe organization URLs', () => {
    expect(() =>
      parseOrganization({ slug: 'arena', name: 'Arena', website: 'javascript:alert(1)' }),
    ).toThrow(BadRequestException);
  });

  it('normalizes assertion decisions', () => {
    expect(parseAssertionDecision({ status: 'effective', reason: 'Source verified' }).status).toBe(
      'EFFECTIVE',
    );
  });

  it('deduplicates role assignments', () => {
    expect(
      parseRoleAssignment({ roleCodes: ['ADMIN', 'ADMIN'], reason: 'Approved request' }).roleCodes,
    ).toEqual(['ADMIN']);
  });

  it('allows only supported user statuses', () => {
    expect(parseUserStatus({ status: 'suspended', reason: 'Policy violation' }).status).toBe(
      'SUSPENDED',
    );
    expect(() => parseUserStatus({ status: 'BANNED', reason: 'Policy violation' })).toThrow(
      BadRequestException,
    );
  });
});
