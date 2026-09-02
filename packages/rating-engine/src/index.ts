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

export const recencyWeight = (daysAgo: number): number => {
  if (daysAgo <= 30) return 1;
  if (daysAgo <= 90) return 0.85;
  if (daysAgo <= 180) return 0.65;
  if (daysAgo <= 365) return 0.4;
  return 0;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

export function calculatePpr(observations: RatingObservation[]): PprResult {
  const weighted = observations
    .map((item) => {
      const opponent = clamp(0.8 + (item.opponentTpr - 500) / 1250, 0.65, 1.25);
      const result = item.result === 'win' ? 1.03 : item.result === 'loss' ? 0.97 : 1;
      const weight =
        recencyWeight(item.daysAgo) *
        opponent *
        item.tournamentCoefficient *
        result *
        clamp(item.dataQuality, 0.65, 1);
      return { value: item.performanceZ * weight, weight };
    })
    .filter((item) => item.weight > 0);

  const effectiveSample = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (effectiveSample === 0) return { score: 500, confidence: 0, effectiveSample: 0 };
  const mean = weighted.reduce((sum, item) => sum + item.value, 0) / effectiveSample;
  const raw = 1000 * sigmoid(0.9 * mean);
  const reliability = effectiveSample / (effectiveSample + 18);
  const score = Math.round(clamp(500 + reliability * (raw - 500), 0, 1000));
  const confidence = Math.round(100 * (1 - Math.exp(-effectiveSample / 18)));
  return { score, confidence, effectiveSample: Number(effectiveSample.toFixed(3)) };
}
