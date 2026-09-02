export interface ThresholdRule {
  code: string;
  metric: string;
  target: number;
  minimumVerificationLevel: number;
  ruleVersion?: number;
}
export interface AchievementFact {
  metric: string;
  value: number;
  verificationLevel: number;
  observedAt?: string;
  evidenceKey?: string;
}
export interface AchievementProgress {
  code: string;
  progress: number;
  target: number;
  granted: boolean;
  provisional: boolean;
  ruleVersion: number;
  firstQualifiedAt?: string;
  evidenceKeys: string[];
}

export type AchievementEventType =
  | 'MatchFinalized'
  | 'TournamentPlacementVerified'
  | 'RosterPeriodClosed'
  | 'RatingPublished'
  | 'FactsReplayed';

export interface CanonicalAchievementEvent {
  eventKey: string;
  type: AchievementEventType;
  subjectId: string;
  occurredAt: string;
  verificationLevel: number;
  metrics: Record<string, number>;
  evidenceKeys?: string[];
}

export function factsFromEvent(event: CanonicalAchievementEvent): AchievementFact[] {
  return Object.entries(event.metrics)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([metric, value]) => ({
      metric,
      value,
      verificationLevel: event.verificationLevel,
      observedAt: event.occurredAt,
      ...(event.evidenceKeys?.length ? { evidenceKey: event.evidenceKeys.join(',') } : {}),
    }));
}

export function evaluateThreshold(
  rule: ThresholdRule,
  facts: AchievementFact[],
): AchievementProgress {
  const relevant = facts.filter((fact) => fact.metric === rule.metric);
  const progress = relevant.reduce((maximum, fact) => Math.max(maximum, fact.value), 0);
  const trusted = relevant.some(
    (fact) => fact.value >= rule.target && fact.verificationLevel >= rule.minimumVerificationLevel,
  );
  const qualifiedFacts = relevant.filter((fact) => fact.value >= rule.target);
  return {
    code: rule.code,
    progress: Math.min(progress, rule.target),
    target: rule.target,
    granted: trusted,
    provisional: progress >= rule.target && !trusted,
    ruleVersion: rule.ruleVersion ?? 1,
    ...(qualifiedFacts
      .map((fact) => fact.observedAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0]
      ? {
          firstQualifiedAt: qualifiedFacts
            .map((fact) => fact.observedAt)
            .filter((value): value is string => Boolean(value))
            .sort()[0],
        }
      : {}),
    evidenceKeys: [
      ...new Set(
        qualifiedFacts.flatMap((fact) => fact.evidenceKey?.split(',') ?? []).filter(Boolean),
      ),
    ].sort(),
  };
}

export function evaluateAchievementCatalog(
  rules: ThresholdRule[],
  event: CanonicalAchievementEvent,
): AchievementProgress[] {
  const facts = factsFromEvent(event);
  return [...rules]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((rule) => evaluateThreshold(rule, facts));
}
