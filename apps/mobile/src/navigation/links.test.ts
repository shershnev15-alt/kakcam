import { describe, expect, it } from 'vitest';
import { canonicalPlayerUrl, playerDeepLink } from './links';

describe('mobile links', () => {
  it('builds an encoded app deep link', () => {
    expect(playerDeepLink('ice storm')).toBe('arenapassport://players/ice%20storm');
  });

  it('normalizes the canonical web base', () => {
    expect(canonicalPlayerUrl('https://arena.example/', 'frostbyte')).toBe(
      'https://arena.example/players/frostbyte',
    );
  });
});
