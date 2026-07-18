/**
 * Normalizes `value` into 0-100 against the min-max range of `value`
 * combined with `history` -- a raw quantity (CTL, ATL, ...) is only
 * meaningful in the athlete's own personal context (a CTL of 60 means
 * something different for a beginner than for an elite), so both
 * fitnessScoreCalculator and fatigueScoreCalculator scale their inputs
 * this same way, relative to where the athlete themselves has recently
 * been, rather than against a fixed population scale.
 */
export function normalizeAgainstOwnRange(value: number, history: number[]): number {
  const allValues = [...history, value];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  if (range === 0) return 50;
  return ((value - min) / range) * 100;
}
