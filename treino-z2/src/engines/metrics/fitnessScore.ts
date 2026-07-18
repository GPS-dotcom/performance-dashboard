import { metricResult, unavailableMetric, type MetricResult } from "./metricResult";

export interface FitnessInputs {
  ctl: number;
  /** Recent daily CTL values (any order) used to build the athlete's own min-max range. */
  ctlHistory: number[];
}

const MIN_HISTORY_FOR_HIGH_QUALITY_DAYS = 14;

/**
 * Fitness Score: CTL normalized against the athlete's own recent CTL
 * range into an interpretable 0-100 band -- raw CTL is only meaningful in
 * personal context (a CTL of 60 means something different for a beginner
 * than for an elite), so this scales it relative to where the athlete
 * themselves has recently been.
 */
export function calculateFitnessScore(inputs: FitnessInputs): MetricResult<number> {
  const requiredInputs = ["ctl", `ctlHistory (>= ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days recommended)`];

  if (inputs.ctlHistory.length === 0) {
    return unavailableMetric(requiredInputs, ["no CTL history to normalize against"]);
  }

  const allValues = [...inputs.ctlHistory, inputs.ctl];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  const rawScore = range === 0 ? 50 : ((inputs.ctl - min) / range) * 100;

  const dataQuality: "high" | "medium" | "low" = inputs.ctlHistory.length >= MIN_HISTORY_FOR_HIGH_QUALITY_DAYS ? "high" : "low";
  const missingInputs =
    inputs.ctlHistory.length < MIN_HISTORY_FOR_HIGH_QUALITY_DAYS
      ? [`fewer than ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days of CTL history`]
      : [];

  return metricResult(
    Math.max(0, Math.min(100, rawScore)),
    Math.min(1, inputs.ctlHistory.length / MIN_HISTORY_FOR_HIGH_QUALITY_DAYS),
    dataQuality,
    requiredInputs,
    missingInputs,
  );
}
