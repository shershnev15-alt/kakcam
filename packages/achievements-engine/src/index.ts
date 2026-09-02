export interface ThresholdRule {
  code: string;
  metric: string;
  target: number;
  minimumVerificationLevel: number;
}
export interface AchievementFact {
  metric: string;
  value: number;
  verificationLevel: number;
}
export interface AchievementProgress {
  code: string;
  progress: number;
  target: number;
  granted: boolean;
  provisional: boolean;
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
  return {
    code: rule.code,
    progress: Math.min(progress, rule.target),
    target: rule.target,
    granted: trusted,
    provisional: progress >= rule.target && !trusted,
  };
}
