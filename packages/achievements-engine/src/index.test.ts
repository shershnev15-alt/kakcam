import { describe, expect, it } from 'vitest';
import { evaluateAchievementCatalog, evaluateThreshold, factsFromEvent } from './index';

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

  it('keeps deterministic evidence and qualification time', () => {
    const facts = [
      {
        metric: 'wins',
        value: 12,
        verificationLevel: 3,
        observedAt: '2026-08-02T00:00:00.000Z',
        evidenceKey: 'match-2',
      },
      {
        metric: 'wins',
        value: 10,
        verificationLevel: 3,
        observedAt: '2026-08-01T00:00:00.000Z',
        evidenceKey: 'match-1',
      },
    ];
    expect(evaluateThreshold(rule, facts)).toMatchObject({
      granted: true,
      firstQualifiedAt: '2026-08-01T00:00:00.000Z',
      evidenceKeys: ['match-1', 'match-2'],
      ruleVersion: 1,
    });
  });

  it('projects canonical event metrics in stable order', () => {
    expect(
      factsFromEvent({
        eventKey: 'player:1:facts',
        type: 'FactsReplayed',
        subjectId: 'player-1',
        occurredAt: '2026-09-02T10:00:00.000Z',
        verificationLevel: 3,
        metrics: { wins: 10, matches: 18 },
      }).map((fact) => fact.metric),
    ).toEqual(['matches', 'wins']);
  });

  it('evaluates catalog deterministically regardless of rule order', () => {
    const event = {
      eventKey: 'player:1:facts',
      type: 'FactsReplayed' as const,
      subjectId: 'player-1',
      occurredAt: '2026-09-02T10:00:00.000Z',
      verificationLevel: 3,
      metrics: { wins: 10, matches: 18 },
    };
    const rules = [
      rule,
      { code: 'career.first_match', metric: 'matches', target: 1, minimumVerificationLevel: 3 },
    ];
    expect(evaluateAchievementCatalog(rules, event).map((item) => item.code)).toEqual([
      'career.first_match',
      'victory.10',
    ]);
  });
});
