export interface RatingObservation {
  performanceZ: number;
  daysAgo: number;
  opponentTpr: number;
  tournamentCoefficient: number;
  result: 'win' | 'draw' | 'loss';
  dataQuality: number;
}

export interface PprResult {
  score: number;
  confidence: number;
  effectiveSample: number;
}

export type RatingTier =
  | 'Rookie'
  | 'Challenger'
  | 'Contender'
  | 'Pro'
  | 'Elite'
  | 'Master'
  | 'Legend';

export interface RatingFactor {
  key: string;
  label: string;
  contribution: number;
}

export interface PprDetailedResult extends PprResult {
  tier: RatingTier;
  factors: RatingFactor[];
  strongestFactor: string;
  weakestFactor: string;
}

export interface TprMatchObservation {
  id: string;
  playedAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  tournamentCoefficient: number;
  dataQuality: number;
}

export interface TprTeamResult {
  teamId: string;
  score: number;
  confidence: number;
  rank: number;
  tier: RatingTier;
  effectiveMatches: number;
  opponentCount: number;
  form: Array<'W' | 'L'>;
  factors: RatingFactor[];
}

export const recencyWeight = (daysAgo: number): number => {
  if (daysAgo <= 30) return 1;
  if (daysAgo <= 90) return 0.85;
  if (daysAgo <= 180) return 0.65;
  if (daysAgo <= 365) return 0.4;
  return 0;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

export function tierForScore(score: number): RatingTier {
  if (score >= 900) return 'Legend';
  if (score >= 800) return 'Master';
  if (score >= 700) return 'Elite';
  if (score >= 600) return 'Pro';
  if (score >= 500) return 'Contender';
  if (score >= 400) return 'Challenger';
  return 'Rookie';
}

export function calculatePprDetailed(observations: RatingObservation[]): PprDetailedResult {
  const weighted = observations
    .map((item) => {
      const recency = recencyWeight(item.daysAgo);
      const opponent = clamp(0.8 + (item.opponentTpr - 500) / 1250, 0.65, 1.25);
      const result = item.result === 'win' ? 1.03 : item.result === 'loss' ? 0.97 : 1;
      const trust = clamp(item.dataQuality, 0.65, 1);
      const weight = recency * opponent * item.tournamentCoefficient * result * trust;
      return { item, value: item.performanceZ * weight, weight, recency, opponent, trust };
    })
    .filter((item) => item.weight > 0);

  const effectiveSample = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (effectiveSample === 0) {
    const factors = [
      { key: 'performance', label: 'Индивидуальная форма', contribution: 0 },
      { key: 'sample', label: 'Объём выборки', contribution: -25 },
      { key: 'opponents', label: 'Сила соперников', contribution: 0 },
      { key: 'trust', label: 'Достоверность данных', contribution: 0 },
    ];
    return {
      score: 500,
      confidence: 0,
      effectiveSample: 0,
      tier: 'Contender',
      factors,
      strongestFactor: 'performance',
      weakestFactor: 'sample',
    };
  }
  const mean = weighted.reduce((sum, item) => sum + item.value, 0) / effectiveSample;
  const raw = 1000 * sigmoid(0.9 * mean);
  const reliability = effectiveSample / (effectiveSample + 18);
  const score = Math.round(clamp(500 + reliability * (raw - 500), 0, 1000));
  const confidence = Math.round(100 * (1 - Math.exp(-effectiveSample / 18)));
  const average = (select: (item: (typeof weighted)[number]) => number) =>
    weighted.reduce((sum, item) => sum + select(item), 0) / weighted.length;
  const factors: RatingFactor[] = [
    {
      key: 'performance',
      label: 'Индивидуальная форма',
      contribution: Math.round(clamp(mean * 48, -60, 60)),
    },
    {
      key: 'sample',
      label: 'Объём выборки',
      contribution: Math.round((reliability - 0.5) * 30),
    },
    {
      key: 'opponents',
      label: 'Сила соперников',
      contribution: Math.round((average((item) => item.opponent) - 1) * 55),
    },
    {
      key: 'trust',
      label: 'Достоверность данных',
      contribution: Math.round((average((item) => item.trust) - 0.65) * 30),
    },
  ];
  const ordered = [...factors].sort((left, right) => right.contribution - left.contribution);
  return {
    score,
    confidence,
    effectiveSample: Number(effectiveSample.toFixed(3)),
    tier: tierForScore(score),
    factors,
    strongestFactor: ordered[0]!.key,
    weakestFactor: ordered.at(-1)!.key,
  };
}

export function calculatePpr(observations: RatingObservation[]): PprResult {
  const { score, confidence, effectiveSample } = calculatePprDetailed(observations);
  return { score, confidence, effectiveSample };
}

export function calculateTprLeaderboard(
  teamIds: string[],
  observations: TprMatchObservation[],
  cutoff: string,
): TprTeamResult[] {
  const cutoffTime = new Date(cutoff).getTime();
  const state = new Map(
    teamIds.map((teamId) => [
      teamId,
      {
        rating: 500,
        effectiveMatches: 0,
        opponents: new Set<string>(),
        form: [] as Array<'W' | 'L'>,
        deltas: [] as number[],
        trust: [] as number[],
        freshness: [] as number[],
      },
    ]),
  );
  const orderedMatches = [...observations]
    .filter((match) => new Date(match.playedAt).getTime() <= cutoffTime)
    .sort(
      (left, right) =>
        left.playedAt.localeCompare(right.playedAt) || left.id.localeCompare(right.id),
    );

  for (const match of orderedMatches) {
    const home = state.get(match.homeTeamId);
    const away = state.get(match.awayTeamId);
    if (!home || !away || match.homeScore === match.awayScore) continue;
    const daysAgo = Math.max(0, (cutoffTime - new Date(match.playedAt).getTime()) / 86_400_000);
    const recency = recencyWeight(daysAgo);
    if (recency === 0) continue;
    const expectedHome = 1 / (1 + 10 ** ((away.rating - home.rating) / 360));
    const actualHome = match.homeScore > match.awayScore ? 1 : 0;
    const margin = Math.abs(match.homeScore - match.awayScore);
    const quality = clamp(1 + (margin - 1) * 0.08, 1, 1.18);
    const sample = Math.min(home.effectiveMatches, away.effectiveMatches);
    const k = sample < 5 ? 42 : sample < 15 ? 32 : 24;
    const weight =
      recency * match.tournamentCoefficient * clamp(match.dataQuality, 0.65, 1) * quality;
    const delta = k * weight * (actualHome - expectedHome);
    home.rating = clamp(home.rating + delta, 0, 1000);
    away.rating = clamp(away.rating - delta, 0, 1000);
    home.effectiveMatches += weight;
    away.effectiveMatches += weight;
    home.opponents.add(match.awayTeamId);
    away.opponents.add(match.homeTeamId);
    home.form.push(actualHome ? 'W' : 'L');
    away.form.push(actualHome ? 'L' : 'W');
    home.deltas.push(delta);
    away.deltas.push(-delta);
    home.trust.push(match.dataQuality);
    away.trust.push(match.dataQuality);
    home.freshness.push(recency);
    away.freshness.push(recency);
  }

  const results = [...state.entries()].map(([teamId, team]) => {
    const sampleFactor = 1 - Math.exp(-team.effectiveMatches / 8);
    const diversity = Math.min(1, team.opponents.size / 5);
    const average = (values: number[], fallback: number) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
    const freshness = average(team.freshness, 0);
    const trust = average(team.trust, 0.65);
    const confidence = Math.round(
      100 * (0.5 * sampleFactor + 0.2 * diversity + 0.15 * freshness + 0.15 * trust),
    );
    const score = Math.round(team.rating);
    const recentDelta = team.deltas.slice(-5).reduce((sum, value) => sum + value, 0);
    const factors: RatingFactor[] = [
      { key: 'results', label: 'Результаты серий', contribution: Math.round(recentDelta) },
      {
        key: 'schedule',
        label: 'Разнообразие соперников',
        contribution: Math.round((diversity - 0.5) * 24),
      },
      {
        key: 'freshness',
        label: 'Свежесть матчей',
        contribution: Math.round((freshness - 0.5) * 20),
      },
      {
        key: 'trust',
        label: 'Достоверность данных',
        contribution: Math.round((trust - 0.65) * 30),
      },
    ];
    return {
      teamId,
      score,
      confidence: clamp(confidence, 0, 100),
      rank: 0,
      tier: tierForScore(score),
      effectiveMatches: Number(team.effectiveMatches.toFixed(3)),
      opponentCount: team.opponents.size,
      form: team.form.slice(-5),
      factors,
    };
  });
  return results
    .sort((left, right) => right.score - left.score || left.teamId.localeCompare(right.teamId))
    .map((result, index) => ({ ...result, rank: index + 1 }));
}
