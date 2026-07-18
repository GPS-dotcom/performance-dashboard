import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { clamp } from "../validators/numberValidators";
import { normalizeAgainstOwnRange } from "./shared/rangeNormalization";

export interface FitnessInputs {
  ctl: number;
  /** Recent daily CTL values (any order) used to build the athlete's own min-max range. */
  ctlHistory: number[];
}

const MIN_HISTORY_FOR_HIGH_QUALITY_DAYS = 14;

/**
 * Fitness Score: CTL normalized against the athlete's own recent CTL
 * range into an interpretable 0-100 band. See rangeNormalization for why
 * this is relative rather than absolute.
 */
export function calculateFitnessScore(inputs: FitnessInputs): MetricResult<number> {
  const requiredInputs = ["ctl", `ctlHistory (>= ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days recommended)`];

  if (inputs.ctlHistory.length === 0) {
    return unavailableMetric(requiredInputs, ["no CTL history to normalize against"]);
  }

  const score = clamp(normalizeAgainstOwnRange(inputs.ctl, inputs.ctlHistory), 0, 100);

  const dataQuality: "high" | "medium" | "low" = inputs.ctlHistory.length >= MIN_HISTORY_FOR_HIGH_QUALITY_DAYS ? "high" : "low";
  const missingInputs =
    inputs.ctlHistory.length < MIN_HISTORY_FOR_HIGH_QUALITY_DAYS
      ? [`fewer than ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days of CTL history`]
      : [];

  return metricResult(
    score,
    Math.min(1, inputs.ctlHistory.length / MIN_HISTORY_FOR_HIGH_QUALITY_DAYS),
    dataQuality,
    requiredInputs,
    missingInputs,
  );
}
