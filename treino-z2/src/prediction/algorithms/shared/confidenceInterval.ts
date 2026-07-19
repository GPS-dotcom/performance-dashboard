// Two interval-construction strategies, used depending on whether the
// underlying algorithm has a real statistical model to draw one from.
// "Toda previsão deve possuir intervalo de confiança" + "Nenhuma previsão
// pode ser uma caixa preta" means every predictor must return bounds, and
// every predictor must document exactly how those bounds were derived --
// so both strategies are named, documented and reused (never duplicated
// per-algorithm).

/**
 * Real statistical prediction interval for a single new x0 from an
 * ordinary least-squares fit: the classic simple-linear-regression
 * formula SE_pred(x0) = s * sqrt(1 + 1/n + (x0-meanX)^2 / Sxx), margin =
 * z * SE_pred(x0) (Draper & Smith, "Applied Regression Analysis", 3rd
 * ed., ch. 1). z=1.645 corresponds to a ~90% prediction interval --
 * chosen (rather than 95%/z=1.96) because these are short, noisy
 * athletic-performance series where a slightly tighter, more usable band
 * is preferable to an overly conservative one; documented explicitly
 * rather than left as an unstated default.
 */
export const PREDICTION_INTERVAL_Z = 1.645;

export function regressionPredictionInterval(
  pointEstimate: number,
  x0: number,
  residualStdError: number | null,
  n: number,
  meanX: number,
  sumSquaredX: number,
): { lowerBound: number; upperBound: number } | null {
  if (residualStdError == null || sumSquaredX === 0) return null;

  const sePred = residualStdError * Math.sqrt(1 + 1 / n + (x0 - meanX) ** 2 / sumSquaredX);
  const margin = PREDICTION_INTERVAL_Z * sePred;
  return { lowerBound: pointEstimate - margin, upperBound: pointEstimate + margin };
}

/**
 * For predictions with no natural statistical model (heuristic
 * classifications/scores, e.g. ACWR-based injury risk, readiness
 * scores): a confidence-scaled symmetric band around `value`, widening as
 * confidence drops. `maxHalfWidth` is the band's width when confidence is
 * 0 (total uncertainty) -- always 0 when confidence is 1. This is
 * explicitly *not* a statistical confidence interval; it exists so every
 * prediction still exposes an explainable lowerBound/upperBound rather
 * than leaving them null when a real interval formula doesn't apply.
 */
export function heuristicBound(value: number, confidence: number, maxHalfWidth: number): { lowerBound: number; upperBound: number } {
  const clampedConfidence = Math.max(0, Math.min(1, confidence));
  const halfWidth = maxHalfWidth * (1 - clampedConfidence);
  return { lowerBound: value - halfWidth, upperBound: value + halfWidth };
}
