import { describe, expect, it } from 'vitest';
import { evaluateThreshold } from './index';

const rule = { code: 'victory.10', metric: 'wins', target: 10, minimumVerificationLevel: 3 };
describe('achievement threshold evaluation', () => {
  it('grants only trusted achievements', () => {
    expect(
      evaluateThreshold(rule, [{ metric: 'wins', value: 10, verificationLevel: 3 }]).granted,
    ).toBe(true);
  });
  it('keeps untrusted completion provisional', () => {
    expect(
      evaluateThreshold(rule, [{ metric: 'wins', value: 12, verificationLevel: 1 }]),
    ).toMatchObject({ granted: false, provisional: true, progress: 10 });
  });
  it('ignores unrelated facts', () => {
    expect(
      evaluateThreshold(rule, [{ metric: 'matches', value: 50, verificationLevel: 5 }]).progress,
    ).toBe(0);
  });
});
