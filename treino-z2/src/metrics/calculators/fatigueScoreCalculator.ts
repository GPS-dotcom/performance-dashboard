import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { clamp } from "../validators/numberValidators";
import { normalizeAgainstOwnRange } from "./shared/rangeNormalization";

export interface FatigueInputs {
  atl: number;
  /** Recent daily ATL values (any order) used to build the athlete's own min-max range. */
  atlHistory: number[];
}

const MIN_HISTORY_FOR_HIGH_QUALITY_DAYS = 7;

/**
 * Fatigue Score: ATL normalized against the athlete's own recent ATL
 * range into an interpretable 0-100 band -- the fatigue-side counterpart
 * to Fitness Score, using the same own-range normalization (see
 * rangeNormalization) but over ATL instead of CTL, and over ATL's
 * shorter 7-day time constant's worth of history rather than CTL's 14.
 */
export function calculateFatigueScore(inputs: FatigueInputs): MetricResult<number> {
  const requiredInputs = ["atl", `atlHistory (>= ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days recommended)`];

  if (inputs.atlHistory.length === 0) {
    return unavailableMetric(requiredInputs, ["no ATL history to normalize against"]);
  }

  const score = clamp(normalizeAgainstOwnRange(inputs.atl, inputs.atlHistory), 0, 100);

  const dataQuality: "high" | "medium" | "low" = inputs.atlHistory.length >= MIN_HISTORY_FOR_HIGH_QUALITY_DAYS ? "high" : "low";
  const missingInputs =
    inputs.atlHistory.length < MIN_HISTORY_FOR_HIGH_QUALITY_DAYS
      ? [`fewer than ${MIN_HISTORY_FOR_HIGH_QUALITY_DAYS} days of ATL history`]
      : [];

  return metricResult(
    score,
    Math.min(1, inputs.atlHistory.length / MIN_HISTORY_FOR_HIGH_QUALITY_DAYS),
    dataQuality,
    requiredInputs,
    missingInputs,
  );
}
