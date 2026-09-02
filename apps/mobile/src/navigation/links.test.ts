import { describe, expect, it } from 'vitest';
import {
  canonicalEntityUrl,
  canonicalPlayerUrl,
  entityDeepLink,
  hrefFromNotificationUrl,
  playerDeepLink,
} from './links';

describe('mobile links', () => {
  it('builds an encoded app deep link', () => {
    expect(playerDeepLink('ice storm')).toBe('arenapassport://players/ice%20storm');
  });

  it('normalizes the canonical web base', () => {
    expect(canonicalPlayerUrl('https://arena.example/', 'frostbyte')).toBe(
      'https://arena.example/players/frostbyte',
    );
  });

  it('builds links for every public entity', () => {
    expect(entityDeepLink('matches', 'match/1')).toBe('arenapassport://matches/match%2F1');
    expect(canonicalEntityUrl('https://arena.example/', 'teams', 'navi')).toBe(
      'https://arena.example/teams/navi',
    );
  });

  it('maps app and universal links to an internal route', () => {
    expect(hrefFromNotificationUrl('arenapassport://matches/abc-123')).toBe('/matches/abc-123');
    expect(hrefFromNotificationUrl('https://arena.example/players/ice%20storm')).toBe(
      '/players/ice%20storm',
    );
  });

  it('rejects unsupported or malformed notification links', () => {
    expect(hrefFromNotificationUrl('arenapassport://settings/profile')).toBeNull();
    expect(hrefFromNotificationUrl('not a url')).toBeNull();
  });
});
