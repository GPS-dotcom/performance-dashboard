// Shared result envelope for every Metrics Engine calculation.
//
// Per 07_METRICS_ENGINE.md's "Confidence Scores" section: "Every
// calculated metric should expose confidence, data_quality,
// required_inputs and missing_inputs." Every calculator in this engine
// returns this shape -- callers can always tell how much to trust a
// number, not just read a bare value, and a metric that could not be
// calculated is a typed, explainable "unavailable" result rather than a
// thrown exception or a silent zero.

export type DataQuality = "high" | "medium" | "low";

export interface MetricResult<T> {
  value: T | null;
  /** 0-1. How much to trust `value`, independent of dataQuality's coarser bucket. */
  confidence: number;
  dataQuality: DataQuality;
  /** What this calculation always needs, regardless of whether it succeeded this time. */
  requiredInputs: string[];
  /** Why confidence/dataQuality isn't higher, or why value is null. Empty when nothing is missing. */
  missingInputs: string[];
}

export function metricResult<T>(
  value: T | null,
  confidence: number,
  dataQuality: DataQuality,
  requiredInputs: string[],
  missingInputs: string[] = [],
): MetricResult<T> {
  return { value, confidence: Math.max(0, Math.min(1, confidence)), dataQuality, requiredInputs, missingInputs };
}

/** A metric that could not be calculated at all -- missingInputs explains why. */
export function unavailableMetric<T>(requiredInputs: string[], missingInputs: string[]): MetricResult<T> {
  return metricResult<T>(null, 0, "low", requiredInputs, missingInputs);
}
