// Shared result envelope for every Metrics Engine calculation.
//
// Per 07_METRICS_ENGINE.md's "Confidence Scores" section: "Every
// calculated metric should expose confidence, data_quality,
// required_inputs and missing_inputs." This type is that contract,
// applied uniformly across LT1/LT2/Critical Power/HR Drift/CTL/ATL/TSB/
// Running Effectiveness/Recovery/Fitness so callers can always tell how
// much to trust a number, not just read a bare value.

export type DataQuality = "high" | "medium" | "low";

export interface MetricResult<T> {
  value: T | null;
  confidence: number; // 0-1
  dataQuality: DataQuality;
  requiredInputs: string[];
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
