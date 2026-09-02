import { describe, expect, it } from 'vitest';
import { formatPercent, initials, score } from './format';

describe('mobile formatting', () => {
  it('formats fractional and whole percentages', () => {
    expect(formatPercent(0.823)).toBe('82%');
    expect(formatPercent(62)).toBe('62%');
  });

  it('creates compact initials and safe scores', () => {
    expect(initials('Northern Lights')).toBe('NL');
    expect(score(null)).toBe('—');
    expect(score(2)).toBe('2');
  });
});
